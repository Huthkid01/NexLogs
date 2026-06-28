-- Admin HTML email campaigns (sent via send-admin-html-campaign edge function)

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  template_name TEXT,
  recipient_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email campaigns" ON email_campaigns;
CREATE POLICY "Admins can view email campaigns"
  ON email_campaigns FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert email campaigns" ON email_campaigns;
CREATE POLICY "Admins can insert email campaigns"
  ON email_campaigns FOR INSERT
  WITH CHECK (is_admin());

COMMENT ON TABLE email_campaigns IS 'Audit log for admin HTML email template campaigns.';
