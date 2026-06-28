-- Store which users received each admin email send (for resending to new signups)

ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS recipient_user_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE email_broadcasts
  ADD COLUMN IF NOT EXISTS recipient_user_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_email_campaigns_recipient_user_ids
  ON email_campaigns USING GIN (recipient_user_ids);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_recipient_user_ids
  ON email_broadcasts USING GIN (recipient_user_ids);

COMMENT ON COLUMN email_campaigns.recipient_user_ids IS 'Profile IDs that were targeted when this HTML campaign was sent.';
COMMENT ON COLUMN email_broadcasts.recipient_user_ids IS 'Profile IDs that were targeted when this product broadcast was sent.';
