-- pg_net must send Authorization when calling Edge Functions (fixes 503 from gateway).

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

  -- Edge Function first (default). email_api_base is optional fallback only.
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
