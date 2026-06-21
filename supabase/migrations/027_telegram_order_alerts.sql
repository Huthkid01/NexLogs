-- Queue Telegram alerts when a new order is created (marketplace + RDP purchases).

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE app_config IS 'Server-only settings for integrations. Manage via Supabase SQL editor (service role).';

CREATE OR REPLACE FUNCTION get_app_config(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM app_config WHERE key = p_key LIMIT 1;
$$;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION queue_telegram_order_alert(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
BEGIN
  v_base_url := get_app_config('supabase_functions_base');
  v_secret := get_app_config('telegram_webhook_secret');

  IF v_base_url IS NULL OR v_base_url = '' OR v_secret IS NULL OR v_secret = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_base_url, '/') || '/telegram-order-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-telegram-webhook-secret', v_secret
    ),
    body := jsonb_build_object('order_id', p_order_id::text)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Never block checkout if Telegram fails
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_telegram_order_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM queue_telegram_order_alert(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_send_telegram_alert ON orders;

CREATE TRIGGER orders_send_telegram_alert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_telegram_order_alert();

-- Run once in Supabase SQL editor (replace values):
-- INSERT INTO app_config (key, value) VALUES
--   ('supabase_functions_base', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'),
--   ('telegram_webhook_secret', 'choose-a-long-random-secret')
-- ON CONFLICT (key) DO UPDATE
--   SET value = EXCLUDED.value, updated_at = NOW();
