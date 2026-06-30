-- Per-recipient marketing email tracking (opens, clicks, delivery status).
-- Inbox vs spam folder placement is NOT available via SMTP; only real interaction events are stored.

CREATE TABLE IF NOT EXISTS email_marketing_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  source_type TEXT NOT NULL CHECK (source_type IN ('broadcast', 'campaign')),
  source_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  send_status TEXT NOT NULL DEFAULT 'pending' CHECK (send_status IN ('pending', 'sent', 'failed')),
  send_error TEXT,
  sent_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  open_count INT NOT NULL DEFAULT 0,
  first_clicked_at TIMESTAMPTZ,
  click_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_marketing_sends_source
  ON email_marketing_sends (source_type, source_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_marketing_sends_token
  ON email_marketing_sends (tracking_token);

CREATE TABLE IF NOT EXISTS email_marketing_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES email_marketing_sends(id) ON DELETE CASCADE,
  link_url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_marketing_clicks_send_id
  ON email_marketing_clicks (send_id, clicked_at DESC);

ALTER TABLE email_marketing_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_marketing_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email marketing sends" ON email_marketing_sends;
CREATE POLICY "Admins can view email marketing sends"
  ON email_marketing_sends FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert email marketing sends" ON email_marketing_sends;
CREATE POLICY "Admins can insert email marketing sends"
  ON email_marketing_sends FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can view email marketing clicks" ON email_marketing_clicks;
CREATE POLICY "Admins can view email marketing clicks"
  ON email_marketing_clicks FOR SELECT
  USING (is_admin());

COMMENT ON TABLE email_marketing_sends IS 'Per-recipient marketing email delivery and engagement (opens/clicks).';
COMMENT ON TABLE email_marketing_clicks IS 'Individual link clicks from marketing emails.';

DROP POLICY IF EXISTS "Admins can update email broadcasts" ON email_broadcasts;
CREATE POLICY "Admins can update email broadcasts"
  ON email_broadcasts FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update email campaigns" ON email_campaigns;
CREATE POLICY "Admins can update email campaigns"
  ON email_campaigns FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
