-- Quick checks when Telegram alerts do not arrive.

-- 1) Config rows must exist
SELECT * FROM app_config WHERE key IN ('supabase_functions_base', 'telegram_webhook_secret');

-- 2) Recent alert attempts (run migration 028 first)
SELECT * FROM telegram_alert_log ORDER BY created_at DESC LIMIT 10;

-- 3) Recent pg_net HTTP responses (shows edge function errors)
SELECT id, status_code, error_msg, LEFT(content, 300) AS content_preview, created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

-- 4) Manually re-queue an alert for your latest order
-- SELECT queue_telegram_order_alert(id) FROM orders ORDER BY created_at DESC LIMIT 1;
