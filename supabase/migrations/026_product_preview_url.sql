-- Optional profile/preview link shown to buyers before purchase.

ALTER TABLE products ADD COLUMN IF NOT EXISTS preview_url TEXT;

COMMENT ON COLUMN products.preview_url IS 'External profile URL buyers can open to preview the account before purchase.';
