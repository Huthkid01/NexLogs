-- Privacy-safe social proof from genuine, transaction-backed orders.
-- This function is read-only: it does not insert, update, or delete any data.

CREATE OR REPLACE FUNCTION public.get_public_order_fomo_feed()
RETURNS TABLE (
  event_key TEXT,
  product_title TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH authentic_orders AS (
    SELECT o.id
    FROM public.orders AS o
    WHERE o.payment_status = 'paid'
      AND o.status IN ('processing', 'completed')
      -- Keep one stable set for the UTC day.
      AND o.created_at < date_trunc('day', now() AT TIME ZONE 'UTC')
      AND (
        EXISTS (
          SELECT 1
          FROM public.wallet_transactions AS wt
          WHERE wt.user_id = o.user_id
            AND wt.kind = 'purchase'
            AND wt.status = 'completed'
            AND wt.metadata ->> 'order_id' = o.id::TEXT
        )
        OR EXISTS (
          SELECT 1
          FROM public.loggsplug_orders AS lo
          JOIN public.wallet_transactions AS wt
            ON wt.id = lo.wallet_transaction_id
          WHERE lo.marketplace_order_id = o.id
            AND lo.user_id = o.user_id
            AND lo.status = 'completed'
            AND wt.kind = 'purchase'
            AND wt.status = 'completed'
        )
      )
  ),
  one_item_per_order AS (
    SELECT DISTINCT ON (ao.id)
      ao.id,
      p.title
    FROM authentic_orders AS ao
    JOIN public.order_items AS oi ON oi.order_id = ao.id
    JOIN public.products AS p ON p.id = oi.product_id
    WHERE NULLIF(btrim(p.title), '') IS NOT NULL
    ORDER BY ao.id, oi.created_at ASC, oi.id ASC
  )
  SELECT
    md5(item.id::TEXT || current_date::TEXT) AS event_key,
    item.title AS product_title
  FROM one_item_per_order AS item
  ORDER BY md5(item.id::TEXT || current_date::TEXT)
  LIMIT 8;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_fomo_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_fomo_feed() TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_order_fomo_feed() IS
  'Returns up to eight genuine past purchases per UTC day without exposing customer, order, price, credential, or timestamp data.';
