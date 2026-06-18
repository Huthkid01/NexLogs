ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage wallets"
  ON wallets FOR ALL USING (is_admin());

CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create own deposit transactions"
  ON wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id AND kind = 'deposit' AND is_active_user());

CREATE POLICY "Admins can manage wallet transactions"
  ON wallet_transactions FOR ALL USING (is_admin());

CREATE POLICY "Site content is viewable by everyone"
  ON site_content_blocks FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage site content"
  ON site_content_blocks FOR ALL USING (is_admin());

CREATE POLICY "Category icons are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'category-icons');

CREATE POLICY "Admins can upload category icons"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-icons' AND is_admin());

CREATE POLICY "Admins can update category icons"
  ON storage.objects FOR UPDATE USING (bucket_id = 'category-icons' AND is_admin());

CREATE POLICY "Admins can delete category icons"
  ON storage.objects FOR DELETE USING (bucket_id = 'category-icons' AND is_admin());
