-- Row Level Security Policies for Nexlogs

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_suspended = FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is not suspended
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_suspended = FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id AND is_suspended = FALSE);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE USING (is_admin());

-- CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL USING (is_admin());

-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active products are viewable by everyone"
  ON products FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage products"
  ON products FOR ALL USING (is_admin());

-- PRODUCT IMAGES
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are viewable by everyone"
  ON product_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND (p.is_active = TRUE OR is_admin()))
  );

CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL USING (is_admin());

-- CARTS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON carts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE USING (auth.uid() = user_id);

-- CART ITEMS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own cart items"
  ON cart_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE USING (is_admin());

-- ORDER ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "Users can insert order items for own orders"
  ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage order items"
  ON order_items FOR ALL USING (is_admin());

-- WISHLISTS
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist"
  ON wishlists FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own wishlist items"
  ON wishlists FOR DELETE USING (auth.uid() = user_id);

-- REVIEWS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved reviews are public"
  ON reviews FOR SELECT USING (is_approved = TRUE OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL USING (is_admin());

-- COUPONS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active coupons viewable by authenticated users"
  ON coupons FOR SELECT USING (
    (active = TRUE AND (expiry_date IS NULL OR expiry_date > NOW())) OR is_admin()
  );

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL USING (is_admin());

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage all notifications"
  ON notifications FOR ALL USING (is_admin());

-- BLOG POSTS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are public"
  ON blog_posts FOR SELECT USING (published = TRUE OR is_admin() OR auth.uid() = author_id);

CREATE POLICY "Admins can manage blog posts"
  ON blog_posts FOR ALL USING (is_admin());

-- FAQS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active FAQs are public"
  ON faqs FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage FAQs"
  ON faqs FOR ALL USING (is_admin());

-- TESTIMONIALS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active testimonials are public"
  ON testimonials FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage testimonials"
  ON testimonials FOR ALL USING (is_admin());

-- ACTIVITY LOGS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON activity_logs FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Authenticated users can insert logs"
  ON activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- STORAGE BUCKETS (run in Supabase dashboard or via SQL)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', TRUE),
  ('avatars', 'avatars', TRUE),
  ('blog-images', 'blog-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Blog images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can manage blog images"
  ON storage.objects FOR ALL USING (bucket_id = 'blog-images' AND is_admin());
