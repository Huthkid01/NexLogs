DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('completed', 'pending', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_kind') THEN
    CREATE TYPE transaction_kind AS ENUM ('deposit', 'purchase', 'refund', 'adjustment', 'referral_bonus');
  END IF;
END $$;

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_details TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ref TEXT NOT NULL UNIQUE,
  kind transaction_kind NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'wallet',
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status transaction_status NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_content_blocks (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'wallets_updated_at') THEN
    NULL;
  ELSE
    CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'wallet_transactions_updated_at') THEN
    NULL;
  ELSE
    CREATE TRIGGER wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'site_content_blocks_updated_at') THEN
    NULL;
  ELSE
    CREATE TRIGGER site_content_blocks_updated_at BEFORE UPDATE ON site_content_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
  SELECT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
BEGIN
  code := generate_referral_code();
  INSERT INTO profiles (id, email, full_name, avatar_url, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    code
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  INSERT INTO carts (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-icons', 'category-icons', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage blog images" ON storage.objects;

DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS faqs CASCADE;
DROP TABLE IF EXISTS testimonials CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
