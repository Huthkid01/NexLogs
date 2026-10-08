-- Masked FOMO names: keep first letter + last 2 chars (e.g. T***jk), not T*** only.

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
  WITH product_events AS (
    SELECT
      ('product:' || o.id::TEXT) AS event_id,
      o.created_at,
      COALESCE(
        NULLIF(btrim(split_part(COALESCE(pr.full_name, ''), ' ', 1)), ''),
        'Customer'
      ) AS first_name,
      p.title AS product_title
    FROM public.orders AS o
    LEFT JOIN public.profiles AS pr ON pr.id = o.user_id
    JOIN public.order_items AS oi ON oi.order_id = o.id
    JOIN public.products AS p ON p.id = oi.product_id
    WHERE o.payment_status = 'paid'
      AND o.status IN ('processing', 'completed')
      AND o.created_at >= (now() - INTERVAL '90 days')
      AND NULLIF(btrim(p.title), '') IS NOT NULL
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
    AND oi.id = (
      SELECT oi2.id
      FROM public.order_items AS oi2
      WHERE oi2.order_id = o.id
      ORDER BY oi2.created_at ASC, oi2.id ASC
      LIMIT 1
    )
  ),
  sms_events AS (
    SELECT
      ('sms:' || s.id::TEXT) AS event_id,
      s.created_at,
      COALESCE(
        NULLIF(btrim(split_part(COALESCE(pr.full_name, ''), ' ', 1)), ''),
        'Customer'
      ) AS first_name,
      trim(
        BOTH ' '
        FROM concat_ws(
          ' ',
          COALESCE(NULLIF(btrim(s.service_name), ''), 'SMS'),
          'verification',
          CASE
            WHEN NULLIF(btrim(s.country_name), '') IS NOT NULL
              THEN '(' || btrim(s.country_name) || ')'
            ELSE NULL
          END
        )
      ) AS product_title
    FROM public.sms_number_orders AS s
    LEFT JOIN public.profiles AS pr ON pr.id = s.user_id
    JOIN public.wallet_transactions AS wt
      ON wt.id = s.wallet_transaction_id
    WHERE s.status IN ('completed', 'active')
      AND s.created_at >= (now() - INTERVAL '90 days')
      AND s.wallet_transaction_id IS NOT NULL
      AND wt.kind = 'purchase'
      AND wt.status = 'completed'
  ),
  combined AS (
    SELECT * FROM product_events
    UNION ALL
    SELECT * FROM sms_events
  ),
  ranked AS (
    SELECT
      c.*,
      row_number() OVER (ORDER BY c.created_at DESC, c.event_id) AS recency_rank
    FROM combined AS c
  ),
  pool AS (
    SELECT *
    FROM ranked
    WHERE recency_rank <= 60
  )
  SELECT
    md5(
      p.event_id
      || to_char(date_trunc('hour', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24')
    ) AS event_key,
    p.product_title,
    CASE
      WHEN lower(p.first_name) = 'customer' THEN 'Customer'
      WHEN char_length(p.first_name) <= 2 THEN left(p.first_name, 1) || '***'
      WHEN char_length(p.first_name) = 3 THEN left(p.first_name, 1) || '***' || right(p.first_name, 1)
      ELSE left(p.first_name, 1) || '***' || right(p.first_name, 2)
    END AS masked_name
  FROM pool AS p
  ORDER BY md5(
    p.event_id
    || to_char(date_trunc('hour', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24')
  )
  LIMIT 60;
$$;

COMMENT ON FUNCTION public.get_public_order_fomo_feed() IS
  'Returns up to 60 recent genuine product + SMS purchases (last 90 days), reshuffled hourly. Masked as T***jk (first + *** + last 2); never exposes phones, emails, order IDs, prices, credentials, or timestamps.';
