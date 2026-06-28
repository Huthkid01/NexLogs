-- Admin product announcement emails (sent via send-admin-broadcast-email edge function)

CREATE TABLE IF NOT EXISTS email_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  custom_message TEXT,
  recipient_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_created_at ON email_broadcasts(created_at DESC);

ALTER TABLE email_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email broadcasts" ON email_broadcasts;
CREATE POLICY "Admins can view email broadcasts"
  ON email_broadcasts FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert email broadcasts" ON email_broadcasts;
CREATE POLICY "Admins can insert email broadcasts"
  ON email_broadcasts FOR INSERT
  WITH CHECK (is_admin());

COMMENT ON TABLE email_broadcasts IS 'Audit log for admin bulk product announcement emails.';
