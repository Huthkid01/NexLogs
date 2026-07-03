-- Treat placeholder codes like "0" as no code; refund invalid pseudo-completions.

CREATE OR REPLACE FUNCTION is_valid_sms_verification_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NULLIF(btrim(COALESCE(p_code, '')), '') IS NULL THEN FALSE
    WHEN btrim(p_code) = '0' THEN FALSE
    WHEN btrim(p_code) ~ '^0+$' THEN FALSE
    WHEN btrim(p_code) ~ '^\d{4,8}$' THEN TRUE
    WHEN length(btrim(p_code)) >= 4 AND btrim(p_code) ~ '^[A-Za-z0-9]+$' THEN TRUE
    ELSE FALSE
  END;
$$;

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

  IF is_valid_sms_verification_code(v_order.verification_code) THEN
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
      verification_code = NULL,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_wallet_transaction_id', v_refund_tx_id,
        'auto_refunded_at', NOW(),
        'auto_refund_reason', v_reason
      ),
      updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_refund_tx_id;
  END IF;

  IF v_order.status NOT IN ('active', 'expired', 'completed') THEN
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
    verification_code = NULL,
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

CREATE OR REPLACE FUNCTION cancel_sms_number_order_and_refund(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'SMS order cancelled'
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

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Refund reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order
  FROM sms_number_orders
  WHERE id = p_order_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF is_valid_sms_verification_code(v_order.verification_code) THEN
    RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE' USING ERRCODE = 'P0001';
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

  IF v_order.status IN ('cancelled', 'refunded', 'expired') THEN
    IF v_refund_tx_id IS NOT NULL THEN
      RETURN v_refund_tx_id;
    END IF;
    RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE' USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE' USING ERRCODE = 'P0001';
  END IF;

  IF v_refund_tx_id IS NOT NULL THEN
    UPDATE sms_number_orders
    SET
      status = 'cancelled',
      verification_code = NULL,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_wallet_transaction_id', v_refund_tx_id,
        'cancelled_at', NOW()
      ),
      updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_refund_tx_id;
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
      'smspool_order_id', v_order.smspool_order_id
    )
  )
  RETURNING id INTO v_refund_tx_id;

  UPDATE wallets
  SET balance = balance + v_order.charged_ngn
  WHERE user_id = v_user_id;

  UPDATE sms_number_orders
  SET
    status = 'cancelled',
    verification_code = NULL,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'refund_wallet_transaction_id', v_refund_tx_id,
      'cancelled_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_refund_tx_id;
END;
$$;

-- Refund existing orders that were incorrectly marked complete with placeholder codes.
DO $$
DECLARE
  v_order sms_number_orders%ROWTYPE;
  v_refund_tx_id UUID;
BEGIN
  FOR v_order IN
    SELECT o.*
    FROM sms_number_orders o
    WHERE o.verification_code IS NOT NULL
      AND NOT is_valid_sms_verification_code(o.verification_code)
      AND NULLIF(btrim(COALESCE(o.metadata->>'refund_wallet_transaction_id', '')), '') IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM wallet_transactions wt
        WHERE wt.user_id = o.user_id
          AND wt.status = 'completed'
          AND wt.metadata->>'source' = 'sms_number_refund'
          AND wt.metadata->>'order_id' = o.id::TEXT
      )
  LOOP
    INSERT INTO wallets (user_id) VALUES (v_order.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
    VALUES (
      v_order.user_id,
      'SMSR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
      'adjustment',
      'wallet',
      v_order.charged_ngn,
      'NGN',
      'completed',
      jsonb_build_object(
        'source', 'sms_number_refund',
        'reason', 'SMS order refunded for invalid placeholder code',
        'order_id', v_order.id,
        'smspool_order_id', v_order.smspool_order_id,
        'auto_refund', true,
        'invalid_code', v_order.verification_code
      )
    )
    RETURNING id INTO v_refund_tx_id;

    UPDATE wallets
    SET balance = balance + v_order.charged_ngn
    WHERE user_id = v_order.user_id;

    UPDATE sms_number_orders
    SET
      status = 'cancelled',
      verification_code = NULL,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_wallet_transaction_id', v_refund_tx_id,
        'auto_refunded_at', NOW(),
        'auto_refund_reason', 'Invalid placeholder verification code'
      ),
      updated_at = NOW()
    WHERE id = v_order.id;
  END LOOP;
END $$;

COMMENT ON FUNCTION is_valid_sms_verification_code(TEXT)
  IS 'True when SMS Pool delivered a real verification code (rejects placeholders like 0).';
