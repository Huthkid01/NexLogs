-- Opt-out from admin promotional emails (product broadcasts + HTML campaigns).
-- Transactional emails (signup, orders, wallet) are unaffected.

CREATE TABLE IF NOT EXISTS marketing_email_unsubscribe_tokens (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_unsubscribe_tokens_token
  ON marketing_email_unsubscribe_tokens(token);

CREATE TABLE IF NOT EXISTS marketing_email_unsubscribes (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_unsubscribes_email
  ON marketing_email_unsubscribes(lower(email));

ALTER TABLE marketing_email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view marketing unsubscribe tokens" ON marketing_email_unsubscribe_tokens;
CREATE POLICY "Admins can view marketing unsubscribe tokens"
  ON marketing_email_unsubscribe_tokens FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can view marketing unsubscribes" ON marketing_email_unsubscribes;
CREATE POLICY "Admins can view marketing unsubscribes"
  ON marketing_email_unsubscribes FOR SELECT
  USING (is_admin());

COMMENT ON TABLE marketing_email_unsubscribe_tokens IS 'Per-user tokens for one-click promotional email unsubscribe links.';
COMMENT ON TABLE marketing_email_unsubscribes IS 'Users who opted out of admin promotional/marketing emails.';
