-- Gmail email setup for Nexlogs (run in Supabase SQL editor)

-- 1) Email webhook secret (must match root .env EMAIL_WEBHOOK_SECRET)
INSERT INTO app_config (key, value) VALUES
  ('email_webhook_secret', 'REPLACE_WITH_SAME_VALUE_AS_EMAIL_WEBHOOK_SECRET')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- 2) Public URL of your Node.js Nodemailer server (NOT Supabase Edge Functions)
-- Local dev with ngrok example: https://abc123.ngrok-free.app
-- Production example: https://nexlogs-email.onrender.com
INSERT INTO app_config (key, value) VALUES
  ('email_api_base', 'https://YOUR_PUBLIC_EMAIL_API_URL')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- 3) Test welcome email manually (replace USER_UUID):
-- SELECT queue_user_email('welcome', 'USER_UUID'::uuid);

-- 4) Test purchase email manually (replace ORDER_UUID):
-- SELECT queue_user_email('purchase', NULL, 'ORDER_UUID'::uuid);

-- 5) Test wallet deposit email manually (replace TRANSACTION_UUID):
-- SELECT queue_user_email('wallet_deposit', NULL, NULL, 'TRANSACTION_UUID'::uuid);
