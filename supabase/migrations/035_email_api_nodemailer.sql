-- Point transactional email queue at the Node.js Nodemailer API (not Supabase Edge Functions).

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

-- Run once in Supabase SQL editor (public URL of your Node email server):
-- INSERT INTO app_config (key, value) VALUES
--   ('email_api_base', 'https://your-email-api.example.com')
-- ON CONFLICT (key) DO UPDATE
--   SET value = EXCLUDED.value, updated_at = NOW();
