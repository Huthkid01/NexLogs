-- Telegram alerts when a customer reserves an SMS verification number.

ALTER TABLE telegram_alert_log
  ADD COLUMN IF NOT EXISTS sms_order_id UUID;

CREATE OR REPLACE FUNCTION queue_telegram_sms_order_alert(p_sms_order_id UUID)
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
    INSERT INTO telegram_alert_log (sms_order_id, error_message)
    VALUES (p_sms_order_id, 'Missing app_config: supabase_functions_base or telegram_webhook_secret');
    RETURN;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base_url, '/') || '/telegram-order-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-telegram-webhook-secret', v_secret
    ),
    body := jsonb_build_object('sms_order_id', p_sms_order_id::text),
    timeout_milliseconds := 15000
  )
  INTO v_request_id;

  INSERT INTO telegram_alert_log (sms_order_id, request_id)
  VALUES (p_sms_order_id, v_request_id);
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO telegram_alert_log (sms_order_id, error_message)
    VALUES (p_sms_order_id, SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_telegram_sms_order_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM queue_telegram_sms_order_alert(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sms_number_orders_send_telegram_alert ON sms_number_orders;

CREATE TRIGGER sms_number_orders_send_telegram_alert
  AFTER INSERT ON sms_number_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_telegram_sms_order_alert();
