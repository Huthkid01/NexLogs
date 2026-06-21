-- Improve Telegram alert reliability and add debug logging.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS telegram_alert_log (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID,
  request_id BIGINT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION queue_telegram_order_alert(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
  v_request_id BIGINT;
BEGIN
  v_base_url := get_app_config('supabase_functions_base');
  v_secret := get_app_config('telegram_webhook_secret');

  IF v_base_url IS NULL OR v_base_url = '' OR v_secret IS NULL OR v_secret = '' THEN
    INSERT INTO telegram_alert_log (order_id, error_message)
    VALUES (p_order_id, 'Missing app_config: supabase_functions_base or telegram_webhook_secret');
    RETURN;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base_url, '/') || '/telegram-order-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-telegram-webhook-secret', v_secret
    ),
    body := jsonb_build_object('order_id', p_order_id::text),
    timeout_milliseconds := 15000
  )
  INTO v_request_id;

  INSERT INTO telegram_alert_log (order_id, request_id)
  VALUES (p_order_id, v_request_id);
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO telegram_alert_log (order_id, error_message)
    VALUES (p_order_id, SQLERRM);
END;
$$;
