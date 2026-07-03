-- SMS number orders (SMS Pool integration) + wallet debit/refund helpers.

CREATE TYPE sms_number_order_status AS ENUM (
  'active',
  'completed',
  'cancelled',
  'refunded',
  'expired'
);

CREATE TABLE sms_number_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  smspool_order_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  country_id TEXT NOT NULL,
  country_name TEXT,
  service_id TEXT NOT NULL,
  service_name TEXT,
  status sms_number_order_status NOT NULL DEFAULT 'active',
  verification_code TEXT,
  verification_message TEXT,
  cost_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
  charged_ngn NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sms_number_orders_user_id_idx ON sms_number_orders (user_id, created_at DESC);
CREATE INDEX sms_number_orders_smspool_order_id_idx ON sms_number_orders (smspool_order_id);
CREATE UNIQUE INDEX sms_number_orders_wallet_tx_unique
  ON sms_number_orders (wallet_transaction_id)
  WHERE wallet_transaction_id IS NOT NULL;

CREATE TRIGGER sms_number_orders_updated_at
  BEFORE UPDATE ON sms_number_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE sms_number_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sms number orders"
  ON sms_number_orders FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage sms number orders"
  ON sms_number_orders FOR ALL
  USING (is_admin());

CREATE OR REPLACE FUNCTION wallet_debit_for_sms(p_amount_ngn NUMERIC, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_ngn IS NULL OR p_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  IF v_balance < p_amount_ngn THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS' USING ERRCODE = 'P0001';
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount_ngn
  WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'SMS-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'purchase',
    'wallet',
    p_amount_ngn,
    'NGN',
    'completed',
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'sms_number')
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION wallet_refund_sms(p_amount_ngn NUMERIC, p_reason TEXT, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
  v_reason TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_ngn IS NULL OR p_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Refund reason is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'SMSR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'adjustment',
    'wallet',
    p_amount_ngn,
    'NGN',
    'completed',
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'sms_number_refund', 'reason', v_reason)
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + p_amount_ngn
  WHERE user_id = v_user_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION wallet_debit_for_sms(NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION wallet_refund_sms(NUMERIC, TEXT, JSONB) TO authenticated;

COMMENT ON TABLE sms_number_orders IS 'Temporary SMS verification numbers purchased via SMS Pool.';
COMMENT ON FUNCTION wallet_debit_for_sms(NUMERIC, JSONB) IS 'Debit NGN wallet for an SMS number purchase.';
COMMENT ON FUNCTION wallet_refund_sms(NUMERIC, TEXT, JSONB) IS 'Refund NGN wallet after a failed/cancelled SMS number order.';
