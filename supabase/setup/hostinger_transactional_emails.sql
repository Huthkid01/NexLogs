-- Purchase + add-funds emails via Edge Function + support@nexlogs.store
-- Run in Supabase SQL Editor after replacing placeholders below.
-- NEVER commit real secrets — copy this file locally as *_ready.sql (gitignored).

INSERT INTO app_config (key, value) VALUES
  ('email_webhook_secret', 'REPLACE_WITH_SAME_AS_EDGE_FUNCTION_EMAIL_WEBHOOK_SECRET'),
  ('supabase_functions_base', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'),
  ('supabase_anon_key', 'REPLACE_WITH_SUPABASE_ANON_KEY')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- Ensure Edge Function is used (remove optional Node API URL if set)
DELETE FROM app_config WHERE key = 'email_api_base';

DROP TRIGGER IF EXISTS wallet_transactions_send_deposit_email ON wallet_transactions;
CREATE TRIGGER wallet_transactions_send_deposit_email
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_wallet_deposit_email();

DROP TRIGGER IF EXISTS orders_send_purchase_email ON orders;
CREATE TRIGGER orders_send_purchase_email
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_purchase_email();

-- pg_net → Edge Function (Authorization header — fixes 503)
CREATE OR REPLACE FUNCTION queue_user_email(
  p_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_functions_base TEXT;
  v_api_base TEXT;
  v_secret TEXT;
  v_anon_key TEXT;
  v_url TEXT;
  v_body JSONB;
  v_headers JSONB;
BEGIN
  v_functions_base := get_app_config('supabase_functions_base');
  v_api_base := get_app_config('email_api_base');
  v_secret := get_app_config('email_webhook_secret');
  v_anon_key := get_app_config('supabase_anon_key');

  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN;
  END IF;

  IF v_functions_base IS NOT NULL AND v_functions_base <> '' THEN
    v_url := rtrim(v_functions_base, '/') || '/send-transactional-email';
  ELSIF v_api_base IS NOT NULL AND v_api_base <> '' THEN
    v_url := rtrim(v_api_base, '/') || '/api/email/send';
  ELSE
    RETURN;
  END IF;

  v_body := jsonb_build_object('type', p_type);
  IF p_user_id IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('user_id', p_user_id::text);
  END IF;
  IF p_order_id IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('order_id', p_order_id::text);
  END IF;
  IF p_transaction_id IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('transaction_id', p_transaction_id::text);
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-email-webhook-secret', v_secret
  );

  IF v_anon_key IS NOT NULL AND v_anon_key <> '' THEN
    v_headers := v_headers || jsonb_build_object(
      'Authorization', 'Bearer ' || v_anon_key,
      'apikey', v_anon_key
    );
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := v_headers,
    body := v_body,
    timeout_milliseconds := 20000
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;
