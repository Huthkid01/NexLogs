-- Public login/setup instructions shown before purchase (separate from short description).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS login_instructions TEXT;

COMMENT ON COLUMN products.login_instructions IS
  'Step-by-step login or usage instructions shown to buyers before purchase.';
