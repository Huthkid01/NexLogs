CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can delete activity logs" ON activity_logs;

CREATE POLICY "Users can view own activity"
  ON activity_logs FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Authenticated users can insert logs"
  ON activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can delete activity logs"
  ON activity_logs FOR DELETE USING (is_admin());
