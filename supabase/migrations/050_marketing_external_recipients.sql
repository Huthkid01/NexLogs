-- Marketing emails to external addresses (not registered users)

CREATE TABLE IF NOT EXISTS marketing_external_unsubscribe_tokens (
  email TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_external_unsubscribe_tokens_token
  ON marketing_external_unsubscribe_tokens(token);

ALTER TABLE marketing_external_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view external unsubscribe tokens" ON marketing_external_unsubscribe_tokens;
CREATE POLICY "Admins can view external unsubscribe tokens"
  ON marketing_external_unsubscribe_tokens FOR SELECT
  USING (is_admin());

-- Allow promotional unsubscribes without a linked user account
ALTER TABLE marketing_email_unsubscribes DROP CONSTRAINT IF EXISTS marketing_email_unsubscribes_pkey;
ALTER TABLE marketing_email_unsubscribes ALTER COLUMN user_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_email_unsubscribes_user_id_unique
  ON marketing_email_unsubscribes(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_email_unsubscribes_email_lower_unique
  ON marketing_email_unsubscribes (lower(email));

ALTER TABLE marketing_email_unsubscribes ADD PRIMARY KEY (email);

ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS recipient_emails TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE email_broadcasts
  ADD COLUMN IF NOT EXISTS recipient_emails TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON TABLE marketing_external_unsubscribe_tokens IS 'One-click unsubscribe tokens for marketing emails sent to non-user addresses.';
COMMENT ON COLUMN email_campaigns.recipient_emails IS 'External email addresses (non-user) targeted when this HTML campaign was sent.';
COMMENT ON COLUMN email_broadcasts.recipient_emails IS 'External email addresses (non-user) targeted when this broadcast was sent.';
