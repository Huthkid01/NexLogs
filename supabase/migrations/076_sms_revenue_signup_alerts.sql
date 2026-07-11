-- SMS revenue is already in sms_number_orders; include signup location, fulfillment emails, and verified-signup Telegram alerts.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS signup_ip TEXT,
  ADD COLUMN IF NOT EXISTS signup_country TEXT,
  ADD COLUMN IF NOT EXISTS signup_region TEXT,
  ADD COLUMN IF NOT EXISTS signup_city TEXT,
  ADD COLUMN IF NOT EXISTS signup_alert_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    code := public.generate_referral_code();
    BEGIN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        referral_code,
        signup_ip,
        signup_country,
        signup_region,
        signup_city
      )
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        code,
        NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data->>'signup_ip', '')), 64), ''),
        NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data->>'signup_country', '')), 120), ''),
        NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data->>'signup_region', '')), 120), ''),
        NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data->>'signup_city', '')), 120), '')
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        signup_ip = COALESCE(profiles.signup_ip, EXCLUDED.signup_ip),
        signup_country = COALESCE(profiles.signup_country, EXCLUDED.signup_country),
        signup_region = COALESCE(profiles.signup_region, EXCLUDED.signup_region),
        signup_city = COALESCE(profiles.signup_city, EXCLUDED.signup_city);
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF attempts >= 8 THEN
          RAISE;
        END IF;
    END;
  END LOOP;

  INSERT INTO public.carts (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION queue_user_email(
  p_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_order_item_id UUID DEFAULT NULL
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
  IF p_order_item_id IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('order_item_id', p_order_item_id::text);
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

CREATE OR REPLACE FUNCTION trigger_queue_order_details_ready_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(trim(NEW.delivered_details), '') = '' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(trim(OLD.delivered_details), '') <> '' THEN
    RETURN NEW;
  END IF;

  PERFORM queue_user_email('order_details_ready', NULL, NULL, NULL, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_send_details_ready_email ON order_items;
CREATE TRIGGER order_items_send_details_ready_email
  AFTER UPDATE OF delivered_details ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_order_details_ready_email();

CREATE OR REPLACE FUNCTION queue_telegram_signup_alert(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
  v_request_id BIGINT;
  v_sent BOOLEAN;
BEGIN
  SELECT signup_alert_sent
  INTO v_sent
  FROM profiles
  WHERE id = p_user_id;

  IF COALESCE(v_sent, FALSE) THEN
    RETURN;
  END IF;

  v_base_url := get_app_config('supabase_functions_base');
  v_secret := get_app_config('telegram_webhook_secret');

  IF v_base_url IS NULL OR v_base_url = '' OR v_secret IS NULL OR v_secret = '' THEN
    RETURN;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base_url, '/') || '/telegram-order-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-telegram-webhook-secret', v_secret
    ),
    body := jsonb_build_object('user_id', p_user_id::text),
    timeout_milliseconds := 15000
  )
  INTO v_request_id;

  UPDATE profiles
  SET signup_alert_sent = TRUE
  WHERE id = p_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM queue_telegram_signup_alert(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_verified();

COMMENT ON COLUMN profiles.signup_ip IS 'Approximate signup IP captured from the client during registration.';
COMMENT ON FUNCTION queue_telegram_signup_alert(UUID) IS 'Notifies admin Telegram bot when a user verifies email (once per profile).';
