-- Stop Telegram bot notifications on verified signup. Order, SMS, and wallet deposit alerts are unchanged.

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_auth_user_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION queue_telegram_signup_alert(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN;
END;
$$;

COMMENT ON FUNCTION queue_telegram_signup_alert(UUID) IS 'Disabled — signup Telegram alerts are turned off.';
