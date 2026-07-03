-- Telegram alerts when a user completes a wallet deposit.

ALTER TABLE telegram_alert_log
  ADD COLUMN IF NOT EXISTS wallet_transaction_id UUID;

CREATE OR REPLACE FUNCTION queue_telegram_wallet_deposit_alert(p_wallet_transaction_id UUID)
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
    INSERT INTO telegram_alert_log (wallet_transaction_id, error_message)
    VALUES (p_wallet_transaction_id, 'Missing app_config: supabase_functions_base or telegram_webhook_secret');
    RETURN;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base_url, '/') || '/telegram-order-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-telegram-webhook-secret', v_secret
    ),
    body := jsonb_build_object('wallet_transaction_id', p_wallet_transaction_id::text),
    timeout_milliseconds := 15000
  )
  INTO v_request_id;

  INSERT INTO telegram_alert_log (wallet_transaction_id, request_id)
  VALUES (p_wallet_transaction_id, v_request_id);
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO telegram_alert_log (wallet_transaction_id, error_message)
    VALUES (p_wallet_transaction_id, SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_telegram_wallet_deposit_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind = 'deposit' AND NEW.status = 'completed' THEN
    PERFORM queue_telegram_wallet_deposit_alert(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_transactions_send_telegram_deposit_alert ON wallet_transactions;

CREATE TRIGGER wallet_transactions_send_telegram_deposit_alert
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_telegram_wallet_deposit_alert();
