-- Gmail transactional emails: welcome, purchase, wallet deposit, password reset tokens.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE password_reset_tokens IS 'Server-only password reset tokens for Gmail auth emails. No public RLS policies.';

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
  v_base_url TEXT;
  v_secret TEXT;
  v_body JSONB;
BEGIN
  v_base_url := get_app_config('email_api_base');
  v_secret := get_app_config('email_webhook_secret');

  IF v_base_url IS NULL OR v_base_url = '' OR v_secret IS NULL OR v_secret = '' THEN
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

  PERFORM net.http_post(
    url := rtrim(v_base_url, '/') || '/api/email/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-email-webhook-secret', v_secret
    ),
    body := v_body
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM queue_user_email('welcome', NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_purchase_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM queue_user_email('purchase', NULL, NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_wallet_deposit_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind = 'deposit' AND NEW.status = 'completed' THEN
    PERFORM queue_user_email('wallet_deposit', NEW.user_id, NULL, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_send_welcome_email ON profiles;
CREATE TRIGGER profiles_send_welcome_email
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_welcome_email();

DROP TRIGGER IF EXISTS orders_send_purchase_email ON orders;
CREATE TRIGGER orders_send_purchase_email
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_purchase_email();

DROP TRIGGER IF EXISTS wallet_transactions_send_deposit_email ON wallet_transactions;
CREATE TRIGGER wallet_transactions_send_deposit_email
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_wallet_deposit_email();

-- Run once in Supabase SQL editor (replace values):
-- INSERT INTO app_config (key, value) VALUES
--   ('email_webhook_secret', 'choose-a-long-random-secret'),
--   ('email_api_base', 'https://your-public-node-email-server.com')
-- ON CONFLICT (key) DO UPDATE
--   SET value = EXCLUDED.value, updated_at = NOW();
