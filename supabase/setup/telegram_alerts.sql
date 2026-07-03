-- Run this once in Supabase → SQL Editor after deploying the telegram-order-alert edge function.
-- Alerts fire for marketplace/RDP orders, SMS number purchases, and wallet deposits.
-- Replace YOUR_PROJECT_REF and choose a random webhook secret.

INSERT INTO app_config (key, value) VALUES
  ('supabase_functions_base', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'),
  ('telegram_webhook_secret', 'replace-with-a-long-random-secret')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();
