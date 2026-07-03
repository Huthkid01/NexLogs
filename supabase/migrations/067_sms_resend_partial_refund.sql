-- Partial refunds after resend: original charge is kept once a code was delivered.

CREATE OR REPLACE FUNCTION sms_order_refundable_ngn(p_order sms_number_orders)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_metadata JSONB;
  v_resend_charge NUMERIC;
BEGIN
  IF is_valid_sms_verification_code(p_order.verification_code) THEN
    RETURN 0;
  END IF;

  v_metadata := COALESCE(p_order.metadata, '{}'::jsonb);

  IF COALESCE(v_metadata->>'code_ever_delivered', '') = 'true'
    OR is_valid_sms_verification_code(v_metadata->>'previous_verification_code') THEN
    v_resend_charge := NULLIF(btrim(COALESCE(v_metadata->>'last_resend_charge_ngn', '')), '')::NUMERIC;
    RETURN CASE
      WHEN v_resend_charge IS NOT NULL AND v_resend_charge > 0 THEN v_resend_charge
      ELSE 0
    END;
  END IF;

  RETURN CASE
    WHEN p_order.charged_ngn IS NOT NULL AND p_order.charged_ngn > 0 THEN p_order.charged_ngn
    ELSE 0
  END;
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
  v_refund_amount NUMERIC;
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

  v_refund_amount := sms_order_refundable_ngn(v_order);
  IF v_refund_amount IS NULL OR v_refund_amount <= 0 THEN
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

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'SMSR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'adjustment',
    'wallet',
    v_refund_amount,
    'NGN',
    'completed',
    jsonb_build_object(
      'source', 'sms_number_refund',
      'reason', v_reason,
      'order_id', p_order_id,
      'smspool_order_id', v_order.smspool_order_id,
      'auto_refund', true,
      'partial_refund', COALESCE(v_order.metadata->>'code_ever_delivered', '') = 'true'
    )
  )
  RETURNING id INTO v_refund_tx_id;

  UPDATE wallets
  SET balance = balance + v_refund_amount
  WHERE user_id = v_user_id;

  UPDATE sms_number_orders
  SET
    status = p_target_status,
    verification_code = NULL,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'refund_wallet_transaction_id', v_refund_tx_id,
      'auto_refunded_at', NOW(),
      'auto_refund_reason', v_reason,
      'last_resend_charge_ngn', NULL
    ),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_refund_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION repair_unrefunded_sms_orders()
RETURNS TABLE (
  repaired_order_id UUID,
  repaired_user_id UUID,
  refunded_ngn NUMERIC,
  refund_transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order sms_number_orders%ROWTYPE;
  v_refund_tx_id UUID;
  v_refund_amount NUMERIC;
BEGIN
  FOR v_order IN
    SELECT o.*
    FROM sms_number_orders o
    WHERE o.wallet_transaction_id IS NOT NULL
      AND NOT is_valid_sms_verification_code(o.verification_code)
      AND sms_order_refundable_ngn(o) > 0
      AND NULLIF(btrim(COALESCE(o.metadata->>'refund_wallet_transaction_id', '')), '') IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM wallet_transactions wt
        WHERE wt.user_id = o.user_id
          AND wt.status = 'completed'
          AND wt.metadata->>'source' = 'sms_number_refund'
          AND wt.metadata->>'order_id' = o.id::TEXT
      )
    ORDER BY o.created_at ASC
  LOOP
    v_refund_amount := sms_order_refundable_ngn(v_order);
    IF v_refund_amount IS NULL OR v_refund_amount <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO wallets (user_id) VALUES (v_order.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
    VALUES (
      v_order.user_id,
      'SMSR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
      'adjustment',
      'wallet',
      v_refund_amount,
      'NGN',
      'completed',
      jsonb_build_object(
        'source', 'sms_number_refund',
        'reason', 'SMS order refunded — no valid verification code received',
        'order_id', v_order.id,
        'smspool_order_id', v_order.smspool_order_id,
        'auto_refund', true,
        'repair', 'repair_unrefunded_sms_orders'
      )
    )
    RETURNING id INTO v_refund_tx_id;

    UPDATE wallets
    SET balance = balance + v_refund_amount
    WHERE user_id = v_order.user_id;

    UPDATE sms_number_orders
    SET
      status = CASE
        WHEN v_order.status IN ('expired', 'cancelled', 'refunded') THEN v_order.status
        ELSE 'cancelled'
      END,
      verification_code = NULL,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_wallet_transaction_id', v_refund_tx_id,
        'auto_refunded_at', NOW(),
        'auto_refund_reason', 'No valid verification code received',
        'last_resend_charge_ngn', NULL
      ),
      updated_at = NOW()
    WHERE id = v_order.id;

    repaired_order_id := v_order.id;
    repaired_user_id := v_order.user_id;
    refunded_ngn := v_refund_amount;
    refund_transaction_id := v_refund_tx_id;
    RETURN NEXT;
  END LOOP;
END;
$$;
