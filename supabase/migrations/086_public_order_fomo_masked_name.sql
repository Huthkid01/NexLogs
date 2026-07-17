-- Add a privacy-safe masked buyer name to the public order FOMO feed.
-- Still read-only: no order/profile rows are inserted, updated, or deleted.

DROP FUNCTION IF EXISTS public.get_public_order_fomo_feed();

CREATE OR REPLACE FUNCTION public.get_public_order_fomo_feed()
RETURNS TABLE (
  event_key TEXT,
  product_title TEXT,
  masked_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH authentic_orders AS (
    SELECT
      o.id,
      COALESCE(
        NULLIF(btrim(split_part(COALESCE(pr.full_name, ''), ' ', 1)), ''),
        'Customer'
      ) AS first_name
    FROM public.orders AS o
    LEFT JOIN public.profiles AS pr ON pr.id = o.user_id
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
      ao.first_name,
      p.title
    FROM authentic_orders AS ao
    JOIN public.order_items AS oi ON oi.order_id = ao.id
    JOIN public.products AS p ON p.id = oi.product_id
    WHERE NULLIF(btrim(p.title), '') IS NOT NULL
    ORDER BY ao.id, oi.created_at ASC, oi.id ASC
  )
  SELECT
    md5(item.id::TEXT || current_date::TEXT) AS event_key,
    item.title AS product_title,
    CASE
      WHEN lower(item.first_name) = 'customer' THEN 'Customer'
      WHEN char_length(item.first_name) <= 1 THEN item.first_name || '***'
      ELSE left(item.first_name, 1)
        || repeat('*', least(greatest(char_length(item.first_name) - 1, 3), 7))
    END AS masked_name
  FROM one_item_per_order AS item
  ORDER BY md5(item.id::TEXT || current_date::TEXT)
  LIMIT 8;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_fomo_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_fomo_feed() TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_order_fomo_feed() IS
  'Returns up to eight genuine past purchases per UTC day with a masked first name only. Never exposes full names, emails, order IDs, prices, credentials, or timestamps.';
