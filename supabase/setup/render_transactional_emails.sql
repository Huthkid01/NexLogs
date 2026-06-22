-- Run AFTER deploying the email API on Render (see DEPLOYMENT_EMAIL.md)

-- 1) Webhook secret — must match EMAIL_WEBHOOK_SECRET on Render
INSERT INTO app_config (key, value) VALUES
  ('email_webhook_secret', 'REPLACE_WITH_YOUR_LONG_RANDOM_SECRET')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- 2) Public Render URL (no trailing slash), e.g. https://nexlogs-email.onrender.com
INSERT INTO app_config (key, value) VALUES
  ('email_api_base', 'https://YOUR-SERVICE.onrender.com')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- 3) Test purchase email (replace ORDER_UUID):
-- SELECT queue_user_email('purchase', NULL, 'ORDER_UUID'::uuid);

-- 4) Test wallet deposit (replace TRANSACTION_UUID):
-- SELECT queue_user_email('wallet_deposit', NULL, NULL, 'TRANSACTION_UUID'::uuid);
