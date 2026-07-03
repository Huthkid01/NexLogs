-- Auto-refund SMS orders that expire (or are cancelled by provider) without a verification code.

CREATE OR REPLACE FUNCTION refund_sms_number_order_without_code(
  p_order_id UUID,
  p_target_status sms_number_order_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_order sms_number_orders%ROWTYPE;
  v_reason TEXT;
  v_refund_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_target_status NOT IN ('expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid target status' USING ERRCODE = '22023';
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    v_reason := CASE
      WHEN p_target_status = 'expired' THEN 'SMS order expired without code'
      ELSE 'SMS order cancelled without code'
    END;
  END IF;

  SELECT * INTO v_order
  FROM sms_number_orders
  WHERE id = p_order_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NULLIF(btrim(COALESCE(v_order.verification_code, '')), '') IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_refund_tx_id := NULLIF(btrim(COALESCE(v_order.metadata->>'refund_wallet_transaction_id', '')), '')::UUID;

  IF v_refund_tx_id IS NULL THEN
    SELECT wt.id INTO v_refund_tx_id
    FROM wallet_transactions wt
    WHERE wt.user_id = v_user_id
      AND wt.status = 'completed'
      AND wt.metadata->>'source' = 'sms_number_refund'
      AND wt.metadata->>'order_id' = p_order_id::TEXT
    ORDER BY wt.created_at ASC
    LIMIT 1;
  END IF;

  IF v_refund_tx_id IS NOT NULL THEN
    UPDATE sms_number_orders
    SET
      status = p_target_status,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_wallet_transaction_id', v_refund_tx_id,
        'auto_refunded_at', NOW(),
        'auto_refund_reason', v_reason
      ),
      updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_refund_tx_id;
  END IF;

  IF v_order.status NOT IN ('active', 'expired') THEN
    RAISE EXCEPTION 'ORDER_NOT_REFUNDABLE' USING ERRCODE = 'P0001';
  END IF;

  IF v_order.charged_ngn IS NULL OR v_order.charged_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid refund amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'SMSR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'adjustment',
    'wallet',
    v_order.charged_ngn,
    'NGN',
    'completed',
    jsonb_build_object(
      'source', 'sms_number_refund',
      'reason', v_reason,
      'order_id', p_order_id,
      'smspool_order_id', v_order.smspool_order_id,
      'auto_refund', true
    )
  )
  RETURNING id INTO v_refund_tx_id;

  UPDATE wallets
  SET balance = balance + v_order.charged_ngn
  WHERE user_id = v_user_id;

  UPDATE sms_number_orders
  SET
    status = p_target_status,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'refund_wallet_transaction_id', v_refund_tx_id,
      'auto_refunded_at', NOW(),
      'auto_refund_reason', v_reason
    ),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_refund_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION refund_sms_number_order_without_code(UUID, sms_number_order_status, TEXT) TO authenticated;

COMMENT ON FUNCTION refund_sms_number_order_without_code(UUID, sms_number_order_status, TEXT)
  IS 'Refund wallet when an SMS order expires or is provider-cancelled without delivering a code. Idempotent.';
