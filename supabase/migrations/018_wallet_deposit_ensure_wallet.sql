-- Ensure wallet row exists before crediting (fixes OAuth users missing wallet row)
CREATE OR REPLACE FUNCTION wallet_deposit(p_amount_usd NUMERIC, p_original_amount NUMERIC, p_currency TEXT, p_payment_method TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'DEP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'deposit',
    COALESCE(NULLIF(p_payment_method, ''), 'card'),
    p_amount_usd,
    'USD',
    'completed',
    jsonb_build_object(
      'original_amount', p_original_amount,
      'original_currency', p_currency
    )
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + p_amount_usd
  WHERE user_id = v_user_id;

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_user_id,
    'wallet_deposit_completed',
    'wallet',
    v_tx_id,
    jsonb_build_object('amount_usd', p_amount_usd)
  );

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
