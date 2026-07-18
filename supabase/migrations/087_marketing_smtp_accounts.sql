-- Extra SMTP accounts for Admin Email Sender (marketing only).
-- Auth/reset/transactional emails keep using Edge Function env SMTP secrets.
-- Passwords are only readable by service_role / edge functions — never by the browser.

CREATE TABLE IF NOT EXISTS public.marketing_smtp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  host TEXT NOT NULL,
  port INT NOT NULL DEFAULT 465 CHECK (port > 0 AND port <= 65535),
  secure BOOLEAN NOT NULL DEFAULT TRUE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'Nexlogs',
  from_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_smtp_accounts_label_not_blank CHECK (length(btrim(label)) > 0),
  CONSTRAINT marketing_smtp_accounts_host_not_blank CHECK (length(btrim(host)) > 0),
  CONSTRAINT marketing_smtp_accounts_username_not_blank CHECK (length(btrim(username)) > 0),
  CONSTRAINT marketing_smtp_accounts_from_address_not_blank CHECK (length(btrim(from_address)) > 0)
);

CREATE INDEX IF NOT EXISTS marketing_smtp_accounts_active_idx
  ON public.marketing_smtp_accounts (is_active, created_at DESC);

DROP TRIGGER IF EXISTS marketing_smtp_accounts_updated_at ON public.marketing_smtp_accounts;
CREATE TRIGGER marketing_smtp_accounts_updated_at
  BEFORE UPDATE ON public.marketing_smtp_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.marketing_smtp_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.marketing_smtp_accounts FROM PUBLIC;
REVOKE ALL ON TABLE public.marketing_smtp_accounts FROM anon;
REVOKE ALL ON TABLE public.marketing_smtp_accounts FROM authenticated;
GRANT ALL ON TABLE public.marketing_smtp_accounts TO service_role;

COMMENT ON TABLE public.marketing_smtp_accounts IS
  'Admin-managed SMTP accounts for marketing Email Sender only. Passwords must not be exposed to the client.';
