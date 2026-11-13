-- Reject disposable / temporary email signups at the Auth layer.
-- Search crawlers are unaffected (they never create auth users).

CREATE OR REPLACE FUNCTION public.is_disposable_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_domain TEXT;
  v_blocked TEXT[] := ARRAY[
    'guerrillamailblock.com',
    'guerrillamail.com',
    'guerrillamail.de',
    'guerrillamail.net',
    'guerrillamail.org',
    'sharklasers.com',
    'grr.la',
    'guerrillamail.info',
    'pokemail.net',
    'spam4.me',
    'marchslurp.com',
    'arcadehearth.com',
    'roomsranked.com',
    'mailinator.com',
    'mailinator.net',
    'tempmail.com',
    'temp-mail.org',
    'temp-mail.io',
    'tmpmail.org',
    'tmpmail.net',
    '10minutemail.com',
    '10minutemail.net',
    'throwawaymail.com',
    'throwaway.email',
    'yopmail.com',
    'yopmail.fr',
    'trashmail.com',
    'getnada.com',
    'emailondeck.com',
    'fakeinbox.com',
    'maildrop.cc',
    'dispostable.com',
    'mailnesia.com',
    'moakt.com',
    'tempail.com',
    'tempr.email',
    'discard.email',
    'discardmail.com',
    'burnermail.io',
    'mailforspam.com',
    'jetable.org',
    'mohmal.com',
    'dropmail.me',
    'inboxkitten.com',
    'harakirimail.com'
  ];
  v_needle TEXT;
  v_needles TEXT[] := ARRAY[
    'guerrillamail',
    'mailinator',
    'tempmail',
    'temp-mail',
    'tmpmail',
    'throwaway',
    'yopmail',
    'trashmail',
    'discardmail',
    '10minutemail',
    'fakeinbox',
    'maildrop',
    'mailnesia',
    'burnermail',
    'jetable',
    'mohmal',
    'dropmail',
    'harakirimail',
    'inboxkitten',
    'tempail',
    'getnada',
    'dispostable',
    'arcadehearth',
    'roomsranked',
    'marchslurp',
    'guerrillamailblock',
    'sharklasers',
    'pokemail'
  ];
BEGIN
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RETURN FALSE;
  END IF;

  v_domain := split_part(v_email, '@', 2);
  IF v_domain = '' THEN
    RETURN FALSE;
  END IF;

  IF v_domain = ANY (v_blocked) THEN
    RETURN TRUE;
  END IF;

  -- Subdomains of blocked roots (e.g. 91w.arcadehearth.com)
  FOREACH v_needle IN ARRAY v_blocked LOOP
    IF v_domain LIKE ('%.' || v_needle) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  FOREACH v_needle IN ARRAY v_needles LOOP
    IF position(v_needle IN v_domain) > 0 THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_disposable_email_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.is_disposable_email(NEW.email) THEN
    RAISE EXCEPTION 'Temporary or disposable email addresses are not allowed'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_disposable_email_signup ON auth.users;
CREATE TRIGGER trg_reject_disposable_email_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_disposable_email_signup();

COMMENT ON FUNCTION public.is_disposable_email(TEXT) IS
  'Returns true when an email domain is a known disposable/temporary mailbox provider.';
COMMENT ON FUNCTION public.reject_disposable_email_signup() IS
  'Blocks auth signups that use disposable email domains. Does not affect site crawling/indexing.';

-- Suspend the Nov 12 disposable-email spam wave (idempotent).
UPDATE public.profiles
SET
  is_suspended = TRUE,
  updated_at = NOW()
WHERE lower(email) IN (
  'nexa4467xq@guerrillamailblock.com',
  'ilse446a0f@marchslurp.com',
  'edin446911@91w.arcadehearth.com',
  'vikki44660a@eme.roomsranked.com'
)
AND COALESCE(is_suspended, FALSE) = FALSE;
