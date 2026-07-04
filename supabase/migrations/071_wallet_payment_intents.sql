CREATE TYPE wallet_payment_provider AS ENUM ('kora', 'flutterwave');

CREATE TYPE wallet_payment_intent_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS wallet_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider wallet_payment_provider NOT NULL,
  reference TEXT NOT NULL,
  expected_amount_ngn NUMERIC NOT NULL CHECK (expected_amount_ngn > 0),
  charge_amount NUMERIC NOT NULL CHECK (charge_amount > 0),
  charge_currency TEXT NOT NULL DEFAULT 'NGN',
  payment_method TEXT NOT NULL DEFAULT 'kora',
  status wallet_payment_intent_status NOT NULL DEFAULT 'pending',
  wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  provider_charge_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_payment_intents_provider_reference_uidx
  ON wallet_payment_intents(provider, reference);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_payment_intents_wallet_transaction_uidx
  ON wallet_payment_intents(wallet_transaction_id)
  WHERE wallet_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wallet_payment_intents_user_created_at_idx
  ON wallet_payment_intents(user_id, created_at DESC);

DROP TRIGGER IF EXISTS wallet_payment_intents_updated_at ON wallet_payment_intents;
CREATE TRIGGER wallet_payment_intents_updated_at
BEFORE UPDATE ON wallet_payment_intents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

ALTER TABLE wallet_payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment intents" ON wallet_payment_intents;
CREATE POLICY "Users can view own payment intents"
  ON wallet_payment_intents FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Admins can manage payment intents" ON wallet_payment_intents;
CREATE POLICY "Admins can manage payment intents"
  ON wallet_payment_intents FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION complete_wallet_payment_intent(
  p_provider wallet_payment_provider,
  p_reference TEXT,
  p_verified_amount_ngn NUMERIC,
  p_original_amount NUMERIC,
  p_original_currency TEXT,
  p_payment_method TEXT DEFAULT NULL,
  p_provider_charge_reference TEXT DEFAULT NULL,
  p_provider_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_intent wallet_payment_intents%ROWTYPE;
  v_tx_id UUID;
  v_amount_ngn NUMERIC;
  v_payment_method TEXT;
  v_original_currency TEXT;
BEGIN
  IF p_reference IS NULL OR btrim(p_reference) = '' THEN
    RAISE EXCEPTION 'Payment reference is required' USING ERRCODE = '22023';
  END IF;

  v_amount_ngn := p_verified_amount_ngn;
  IF v_amount_ngn IS NULL OR v_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Verified amount must be greater than zero' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_intent
  FROM wallet_payment_intents
  WHERE provider = p_provider
    AND reference = btrim(p_reference)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_INTENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_intent.wallet_transaction_id IS NOT NULL THEN
    RETURN v_intent.wallet_transaction_id;
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_intent.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  v_payment_method := COALESCE(
    NULLIF(btrim(COALESCE(p_payment_method, '')), ''),
    NULLIF(btrim(COALESCE(v_intent.payment_method, '')), ''),
    p_provider::TEXT
  );
  v_original_currency := COALESCE(NULLIF(btrim(COALESCE(p_original_currency, '')), ''), 'NGN');

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_intent.user_id,
    'DEP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'deposit',
    v_payment_method,
    v_amount_ngn,
    'NGN',
    'completed',
    jsonb_build_object(
      'tx_ref', v_intent.reference,
      'original_amount', p_original_amount,
      'original_currency', v_original_currency,
      'source', p_provider::TEXT || '_deposit'
    )
      || CASE
           WHEN p_provider_charge_reference IS NOT NULL AND btrim(p_provider_charge_reference) <> '' THEN
             jsonb_build_object('provider_charge_reference', btrim(p_provider_charge_reference))
           ELSE '{}'::jsonb
         END
      || COALESCE(p_provider_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + v_amount_ngn
  WHERE user_id = v_intent.user_id;

  UPDATE wallet_payment_intents
  SET
    status = 'succeeded',
    wallet_transaction_id = v_tx_id,
    provider_charge_reference = COALESCE(
      NULLIF(btrim(COALESCE(p_provider_charge_reference, '')), ''),
      provider_charge_reference
    ),
    metadata = metadata || COALESCE(p_provider_metadata, '{}'::jsonb),
    verified_at = NOW(),
    updated_at = NOW()
  WHERE id = v_intent.id;

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_intent.user_id,
    'wallet_deposit_completed',
    'wallet',
    v_tx_id,
    jsonb_build_object(
      'amount_ngn', v_amount_ngn,
      'provider', p_provider::TEXT,
      'reference', v_intent.reference
    )
  );

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_wallet_payment_intent(
  wallet_payment_provider,
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  JSONB
) TO service_role;

COMMENT ON FUNCTION complete_wallet_payment_intent(
  wallet_payment_provider,
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  JSONB
) IS 'Credits a verified wallet payment intent exactly once and returns the wallet transaction id.';
