-- LOGGSPLUG purchases run in an edge function with the service_role key.
-- Wallet debit/refund must accept an explicit user id because calling with the
-- buyer's JWT makes PostgREST treat the caller as `authenticated`, which is not
-- granted EXECUTE on these RPCs.

DROP FUNCTION IF EXISTS wallet_debit_for_supplier_purchase(NUMERIC, JSONB);
DROP FUNCTION IF EXISTS wallet_refund_supplier_purchase(NUMERIC, TEXT, JSONB);

CREATE OR REPLACE FUNCTION wallet_debit_for_supplier_purchase(
  p_amount_ngn NUMERIC,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_tx_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
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
    'SUP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'purchase',
    'wallet',
    p_amount_ngn,
    'NGN',
    'completed',
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'supplier_purchase')
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION wallet_refund_supplier_purchase(
  p_amount_ngn NUMERIC,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_ngn IS NULL OR p_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets
  SET balance = balance + p_amount_ngn
  WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'REF-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'refund',
    'wallet',
    p_amount_ngn,
    'NGN',
    'completed',
    jsonb_build_object('reason', COALESCE(p_reason, 'Supplier purchase failed'))
      || COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('source', 'supplier_purchase_refund')
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION wallet_debit_for_supplier_purchase(NUMERIC, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION wallet_debit_for_supplier_purchase(NUMERIC, JSONB, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION wallet_debit_for_supplier_purchase(NUMERIC, JSONB, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION wallet_refund_supplier_purchase(NUMERIC, TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION wallet_refund_supplier_purchase(NUMERIC, TEXT, JSONB, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION wallet_refund_supplier_purchase(NUMERIC, TEXT, JSONB, UUID) TO service_role;
