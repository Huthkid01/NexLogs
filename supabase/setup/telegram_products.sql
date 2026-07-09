-- Telegram marketplace category + products (data only — safe to run in Supabase SQL Editor)
-- Uses ON CONFLICT DO NOTHING so re-running will not duplicate or break existing rows.
-- No schema changes / no migrations required.
--
-- Manual fulfillment: each product gets 100 inventory placeholders so purchases succeed
-- without auto-delivering credentials. Support fulfills via Admin → Orders.
--
-- Prices are stored in NGN (app display currency). USD reference from catalog:
--   $4.00 → ₦6,000 | $2.89 → ₦4,335 | $23 → ₦34,500 | $6 → ₦9,000 | $18 → ₦27,000

INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
VALUES (
  'Telegram',
  'telegram',
  'Aged Telegram accounts and premium verification',
  '/images/platforms/telegram.png',
  6,
  TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

INSERT INTO products (
  title,
  slug,
  description,
  platform,
  price,
  stock,
  account_age,
  country,
  niche,
  verified,
  featured,
  sort_order,
  login_instructions,
  product_details,
  category_id,
  is_active
)
SELECT
  p.title,
  p.slug,
  p.description,
  p.platform::platform_type,
  p.price,
  p.stock,
  p.account_age,
  p.country,
  p.niche,
  p.verified,
  p.featured,
  p.sort_order,
  p.login_instructions,
  (
    SELECT string_agg('TELEGRAM_MANUAL_FULFILLMENT', E'\n')
    FROM generate_series(1, p.stock)
  ),
  c.id,
  TRUE
FROM (VALUES
  (
    '1 YEAR OLD USA TELEGRAM ACCOUNT',
    '1-year-old-usa-telegram-account',
    '1 year OLD strong USA Telegram account| with few or no chat activities',
    'snapchat',
    6000.00,
    100,
    '1 year',
    'United States',
    'Telegram',
    FALSE,
    TRUE,
    1,
    'Copy your Order ID from My Purchases, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.'
  ),
  (
    '1-5 MONTHS OLD USA TELEGRAM ACCOUNT',
    '1-5-months-old-usa-telegram-account',
    '1-5 months OLD USA Telegram account| with few or no chat activities',
    'snapchat',
    4335.00,
    100,
    '1-5 months',
    'United States',
    'Telegram',
    FALSE,
    TRUE,
    2,
    'Copy your Order ID from My Purchases, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.'
  ),
  (
    '6 MONTHS TELEGRAM VERIFICATION ✪',
    '6-months-telegram-verification',
    '6 months telegram premium subscription• unlock more features',
    'snapchat',
    34500.00,
    100,
    '6 months',
    'Global',
    'Telegram',
    TRUE,
    TRUE,
    3,
    'Copy your Order ID from My Purchases, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.'
  ),
  (
    '3 YEAR OLD NIGERIA TELEGRAM ACCOUNT +234',
    '3-year-old-nigeria-telegram-account-234',
    '3 year old Ready made Nigerian telegram account 🇳🇬',
    'snapchat',
    9000.00,
    100,
    '3 years',
    'Nigeria',
    'Telegram',
    FALSE,
    TRUE,
    4,
    'Copy your Order ID from My Purchases, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.'
  ),
  (
    'TELEGRAM PREMIUM VERIFICATION ✪',
    'telegram-premium-verification',
    '3 Months Telegram premium verification•get access to unlimited premium features',
    'snapchat',
    27000.00,
    100,
    '3 months',
    'Global',
    'Telegram',
    TRUE,
    TRUE,
    5,
    'Copy your Order ID from My Purchases, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.'
  )
) AS p(
  title,
  slug,
  description,
  platform,
  price,
  stock,
  account_age,
  country,
  niche,
  verified,
  featured,
  sort_order,
  login_instructions
)
JOIN categories c ON c.slug = 'telegram'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  account_age = EXCLUDED.account_age,
  country = EXCLUDED.country,
  niche = EXCLUDED.niche,
  verified = EXCLUDED.verified,
  featured = EXCLUDED.featured,
  sort_order = EXCLUDED.sort_order,
  login_instructions = EXCLUDED.login_instructions,
  product_details = EXCLUDED.product_details,
  category_id = EXCLUDED.category_id,
  is_active = TRUE;

INSERT INTO product_images (product_id, image_url, sort_order)
SELECT p.id, '/images/platforms/telegram.png', 0
FROM products p
WHERE p.slug IN (
  '1-year-old-usa-telegram-account',
  '1-5-months-old-usa-telegram-account',
  '6-months-telegram-verification',
  '3-year-old-nigeria-telegram-account-234',
  'telegram-premium-verification'
)
AND NOT EXISTS (
  SELECT 1
  FROM product_images pi
  WHERE pi.product_id = p.id AND pi.sort_order = 0
);

UPDATE product_images
SET image_url = '/images/platforms/telegram.png'
WHERE product_id IN (
  SELECT id FROM products WHERE slug IN (
    '1-year-old-usa-telegram-account',
    '1-5-months-old-usa-telegram-account',
    '6-months-telegram-verification',
    '3-year-old-nigeria-telegram-account-234',
    'telegram-premium-verification'
  )
);
