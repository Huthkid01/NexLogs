ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create support tickets"
  ON support_tickets FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can view own support tickets"
  ON support_tickets FOR SELECT USING (
    auth.uid() = user_id OR is_admin()
  );

CREATE POLICY "Admins can manage support tickets"
  ON support_tickets FOR ALL USING (is_admin());
