-- Admin-only wallet credit for resolving missed Kora deposits.

CREATE OR REPLACE FUNCTION admin_credit_wallet(
  p_user_id UUID,
  p_amount_usd NUMERIC,
  p_reason TEXT,
  p_external_ref TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_tx_id UUID;
  v_reason TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required' USING ERRCODE = '22023';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero' USING ERRCODE = '22023';
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Reason is required' USING ERRCODE = '22023';
  END IF;

  IF p_external_ref IS NOT NULL AND btrim(p_external_ref) <> '' THEN
    SELECT wt.id INTO v_tx_id
    FROM wallet_transactions wt
    WHERE wt.user_id = p_user_id
      AND wt.metadata->>'tx_ref' = btrim(p_external_ref)
    LIMIT 1;

    IF v_tx_id IS NOT NULL THEN
      RETURN v_tx_id;
    END IF;
  END IF;

  INSERT INTO wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    p_user_id,
    'ADJ-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'adjustment',
    'admin',
    p_amount_usd,
    'USD',
    'completed',
    jsonb_build_object(
      'reason', v_reason,
      'credited_by', v_admin_id,
      'source', 'admin_manual_credit'
    ) || CASE
      WHEN p_external_ref IS NOT NULL AND btrim(p_external_ref) <> '' THEN
        jsonb_build_object('tx_ref', btrim(p_external_ref))
      ELSE '{}'::jsonb
    END
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + p_amount_usd
  WHERE user_id = p_user_id;

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    p_user_id,
    'wallet_admin_credit',
    'wallet',
    v_tx_id,
    jsonb_build_object(
      'amount_usd', p_amount_usd,
      'reason', v_reason,
      'credited_by', v_admin_id,
      'external_ref', NULLIF(btrim(COALESCE(p_external_ref, '')), '')
    )
  );

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_credit_wallet(UUID, NUMERIC, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_credit_wallet IS 'Admin-only manual wallet credit (e.g. missed Kora deposit). Idempotent when p_external_ref matches an existing tx_ref.';
