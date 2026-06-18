DROP POLICY IF EXISTS "Authenticated users can insert logs" ON activity_logs;

CREATE POLICY "Authenticated users can insert logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR is_admin()
  );
