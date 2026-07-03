-- Fire SMS Telegram alerts only when a verification code is successfully received,
-- not when the number is first reserved.

CREATE OR REPLACE FUNCTION sms_verification_code_is_valid(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_code IS NOT NULL
    AND btrim(p_code) <> ''
    AND btrim(p_code) <> '0'
    AND btrim(p_code) !~ '^0+$'
    AND (
      btrim(p_code) ~ '^\d{4,8}$'
      OR (
        length(btrim(p_code)) >= 4
        AND btrim(p_code) ~ '^[a-zA-Z0-9]+$'
      )
    );
$$;

CREATE OR REPLACE FUNCTION trigger_queue_telegram_sms_order_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alert only the first time a real verification code is stored.
  IF sms_verification_code_is_valid(NEW.verification_code)
     AND NOT sms_verification_code_is_valid(OLD.verification_code) THEN
    PERFORM queue_telegram_sms_order_alert(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sms_number_orders_send_telegram_alert ON sms_number_orders;

CREATE TRIGGER sms_number_orders_send_telegram_alert
  AFTER UPDATE OF verification_code ON sms_number_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_telegram_sms_order_alert();
