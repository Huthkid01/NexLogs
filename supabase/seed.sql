-- Nexlogs Seed Data
-- Run after migrations in Supabase SQL Editor

-- Categories
INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES
  ('Instagram', 'instagram', 'Premium Instagram accounts with engaged followers', '/images/platforms/instagram.png', 1),
  ('TikTok', 'tiktok', 'Viral TikTok accounts ready for monetization', '/images/platforms/tiktok.png', 2),
  ('Twitter (X)', 'x-twitter', 'Verified X accounts with active communities', '/images/platforms/x.png', 3),
  ('Facebook', 'facebook', 'Facebook pages and profiles with reach', '/images/platforms/facebook.png', 4),
  ('Snapchat', 'snapchat', 'Snapchat accounts with high engagement', '/images/platforms/snapchat.svg', 5),
  ('Telegram', 'telegram', 'Aged Telegram accounts and premium verification', '/images/platforms/telegram.png', 6)
ON CONFLICT (slug) DO NOTHING;

-- Products (using category slugs)
INSERT INTO products (title, slug, description, platform, price, stock, followers, following, account_age, country, niche, verified, featured, category_id)
SELECT
  p.title, p.slug, p.description, p.platform::platform_type, p.price, p.stock,
  p.followers, p.following, p.account_age, p.country, p.niche, p.verified, p.featured,
  c.id
FROM (VALUES
  ('Lifestyle Instagram - 50K Followers', 'lifestyle-instagram-50k', 'Engaged lifestyle Instagram account with 50K real followers. Perfect for brand partnerships and affiliate marketing.', 'instagram', 2499.00, 1, 50000, 1200, '3 years', 'United States', 'Lifestyle', TRUE, TRUE, 'instagram'),
  ('Fitness TikTok - 120K Followers', 'fitness-tiktok-120k', 'High-engagement fitness TikTok with viral content history. Monetization ready with consistent 500K+ views per video.', 'tiktok', 3999.00, 1, 120000, 450, '2 years', 'United Kingdom', 'Fitness', TRUE, TRUE, 'tiktok'),
  ('Crypto X Account - 80K Followers', 'crypto-x-80k', 'Verified X account focused on cryptocurrency and Web3. High engagement rate with active community.', 'x', 3299.00, 1, 80000, 800, '2 years', 'United States', 'Crypto', TRUE, FALSE, 'x-twitter'),
  ('Beauty Instagram - 35K Followers', 'beauty-instagram-35k', 'Beauty and skincare Instagram with predominantly female audience. Great for cosmetic brand deals.', 'instagram', 1899.00, 2, 35000, 900, '18 months', 'Australia', 'Beauty', FALSE, FALSE, 'instagram'),
  ('Food TikTok - 200K Followers', 'food-tiktok-200k', 'Viral food content TikTok with recipe videos averaging 1M views. Perfect for kitchenware brands.', 'tiktok', 5999.00, 1, 200000, 300, '3 years', 'United States', 'Food', TRUE, FALSE, 'tiktok'),
  ('Business Facebook Page - 45K Likes', 'business-facebook-45k', 'Established business Facebook page with engaged community. Ideal for local business marketing.', 'facebook', 1599.00, 1, 45000, 50, '4 years', 'United States', 'Business', FALSE, FALSE, 'facebook'),
  ('Fashion Snapchat - 30K Followers', 'fashion-snapchat-30k', 'Fashion-focused Snapchat with daily stories and high view rates. Young demographic audience.', 'snapchat', 999.00, 2, 30000, 100, '1 year', 'France', 'Fashion', FALSE, FALSE, 'snapchat'),
  ('Travel Instagram - 75K Followers', 'travel-instagram-75k', 'Stunning travel photography account with global audience. Partnership ready with tourism brands.', 'instagram', 4499.00, 1, 75000, 1500, '3 years', 'Spain', 'Travel', TRUE, TRUE, 'instagram'),
  ('1 YEAR OLD USA TELEGRAM ACCOUNT', '1-year-old-usa-telegram-account', '1 year OLD strong USA Telegram account| with few or no chat activities', 'snapchat', 6000.00, 100, 0, 0, '1 year', 'United States', 'Telegram', FALSE, TRUE, 'telegram'),
  ('1-5 MONTHS OLD USA TELEGRAM ACCOUNT', '1-5-months-old-usa-telegram-account', '1-5 months OLD USA Telegram account| with few or no chat activities', 'snapchat', 4335.00, 100, 0, 0, '1-5 months', 'United States', 'Telegram', FALSE, TRUE, 'telegram'),
  ('6 MONTHS TELEGRAM VERIFICATION ✪', '6-months-telegram-verification', '6 months telegram premium subscription• unlock more features', 'snapchat', 34500.00, 100, 0, 0, '6 months', 'Global', 'Telegram', TRUE, TRUE, 'telegram'),
  ('3 YEAR OLD NIGERIA TELEGRAM ACCOUNT +234', '3-year-old-nigeria-telegram-account-234', '3 year old Ready made Nigerian telegram account 🇳🇬', 'snapchat', 9000.00, 100, 0, 0, '3 years', 'Nigeria', 'Telegram', FALSE, TRUE, 'telegram'),
  ('TELEGRAM PREMIUM VERIFICATION ✪', 'telegram-premium-verification', '3 Months Telegram premium verification•get access to unlimited premium features', 'snapchat', 27000.00, 100, 0, 0, '3 months', 'Global', 'Telegram', TRUE, TRUE, 'telegram')
) AS p(title, slug, description, platform, price, stock, followers, following, account_age, country, niche, verified, featured, cat_slug)
JOIN categories c ON c.slug = p.cat_slug
ON CONFLICT (slug) DO NOTHING;

-- Product icons
INSERT INTO product_images (product_id, image_url, sort_order)
SELECT
  p.id,
  CASE p.platform
    WHEN 'instagram' THEN '/images/platforms/instagram.png'
    WHEN 'tiktok' THEN '/images/platforms/tiktok.png'
    WHEN 'x' THEN '/images/platforms/x.png'
    WHEN 'facebook' THEN '/images/platforms/facebook.png'
    WHEN 'snapchat' THEN '/images/platforms/snapchat.svg'
    WHEN 'youtube' THEN '/images/platforms/youtube.svg'
    ELSE CASE
      WHEN p.slug LIKE '%telegram%' THEN '/images/platforms/telegram.png'
      ELSE '/images/platforms/instagram.png'
    END
  END,
  0
FROM products p
ON CONFLICT DO NOTHING;

-- Telegram manual-fulfillment inventory (100 placeholder lines per product)
UPDATE products
SET
  login_instructions = 'Copy your Order ID from My Purchases, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.',
  product_details = (
    SELECT string_agg('TELEGRAM_MANUAL_FULFILLMENT', E'\n')
    FROM generate_series(1, 100)
  ),
  stock = 100
WHERE niche = 'Telegram';

-- Coupons
INSERT INTO coupons (code, discount, discount_type, min_purchase, max_uses, expiry_date, active) VALUES
  ('WELCOME10', 10, 'percentage', 100, 1000, NOW() + INTERVAL '1 year', TRUE),
  ('SAVE50', 50, 'fixed', 500, 100, NOW() + INTERVAL '6 months', TRUE),
  ('VIP20', 20, 'percentage', 1000, 50, NOW() + INTERVAL '3 months', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Blog posts (requires admin user - insert after first admin is created)
-- Note: Update author_id after creating admin user
