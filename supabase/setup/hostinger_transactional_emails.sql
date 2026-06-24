-- Purchase + add-funds emails via Supabase Edge Function (Nodemailer + sales@nexlogs.store)
-- No Render, no ngrok, no separate VPS — deploy the function once from this repo.
-- See: DEPLOYMENT_EMAIL.md

-- 1) Webhook secret — must match EMAIL_WEBHOOK_SECRET in Supabase Edge Function secrets
INSERT INTO app_config (key, value) VALUES
  ('email_webhook_secret', 'REPLACE_WITH_YOUR_LONG_RANDOM_SECRET')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- 2) Supabase Edge Functions base URL (same key used for Telegram alerts)
INSERT INTO app_config (key, value) VALUES
  ('supabase_functions_base', 'https://opmjctjzwkvwsxenddfi.supabase.co/functions/v1')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- 3) Ensure triggers are active (migration 039)
-- SELECT queue_user_email('purchase', NULL, 'ORDER_UUID'::uuid);
-- SELECT queue_user_email('wallet_deposit', NULL, NULL, 'TRANSACTION_UUID'::uuid);
