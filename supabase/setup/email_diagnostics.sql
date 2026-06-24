-- Email diagnostics — run in Supabase SQL Editor
-- See DEPLOYMENT_EMAIL.md if anything is missing

-- 1) Config (must have both rows with real values, not placeholders)
SELECT key, value,
  CASE
    WHEN value IS NULL OR value = '' THEN 'MISSING'
    WHEN value LIKE 'REPLACE%' THEN 'NOT CONFIGURED'
    ELSE 'ok'
  END AS status
FROM app_config
WHERE key IN ('email_webhook_secret', 'supabase_functions_base', 'email_api_base')
ORDER BY key;

-- 2) Triggers (should return 2 rows)
SELECT tgname AS trigger_name, relname AS table_name, tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE tgname IN ('wallet_transactions_send_deposit_email', 'orders_send_purchase_email');

-- 3) Latest completed deposit (use id for manual test below)
SELECT id, user_id, amount, ref, status, created_at
FROM wallet_transactions
WHERE kind = 'deposit' AND status = 'completed'
ORDER BY created_at DESC
LIMIT 5;

-- 4) Manual send test — replace TRANSACTION_UUID with id from step 3
-- SELECT queue_user_email('wallet_deposit', NULL, NULL, 'TRANSACTION_UUID'::uuid);

-- 5) After step 4, check Edge Function logs:
-- Dashboard → Edge Functions → send-transactional-email → Logs
