-- Run once in Supabase → SQL Editor to stop signup Telegram bot notifications.
-- Order, SMS, and wallet deposit Telegram alerts are not affected.

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
