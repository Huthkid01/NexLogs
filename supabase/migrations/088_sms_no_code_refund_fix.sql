-- Fix SMS wallet refunds when no verification code is received.
-- 1) Allow refunds from cancelled/expired rows that never got a wallet credit back.
-- 2) Allow service_role callers (edge functions) to refund by order user_id.
-- 3) Add service-role SMS wallet refund helper (same pattern as LOGGSPLUG).

CREATE OR REPLACE FUNCTION wallet_refund_sms_for_user(
  p_user_id UUID,
  p_amount_ngn NUMERIC,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_reason TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_ngn IS NULL OR p_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Refund reason is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    p_user_id,
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
  WHERE user_id = p_user_id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION wallet_refund_sms_for_user(UUID, NUMERIC, TEXT, JSONB) TO service_role;

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
  v_caller UUID;
  v_user_id UUID;
  v_order sms_number_orders%ROWTYPE;
  v_reason TEXT;
  v_refund_tx_id UUID;
  v_refund_amount NUMERIC;
BEGIN
  v_caller := auth.uid();

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
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_caller IS NOT NULL THEN
    IF v_order.user_id <> v_caller THEN
      RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    v_user_id := v_caller;
  ELSE
    -- Edge functions call this with the service_role key.
    v_user_id := v_order.user_id;
  END IF;

  IF is_valid_sms_verification_code(v_order.verification_code) THEN
    RETURN NULL;
  END IF;

  v_refund_amount := sms_order_refundable_ngn(v_order);
  IF v_refund_amount IS NULL OR v_refund_amount <= 0 THEN
    -- Fall back to full charged amount when partial-resend metadata is incomplete.
    v_refund_amount := CASE
      WHEN v_order.charged_ngn IS NOT NULL AND v_order.charged_ngn > 0 THEN v_order.charged_ngn
      ELSE 0
    END;
  END IF;

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

  -- Include cancelled: previous bugs marked cancelled before wallet credit succeeded.
  IF v_order.status NOT IN ('active', 'expired', 'completed', 'cancelled') THEN
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

GRANT EXECUTE ON FUNCTION refund_sms_number_order_without_code(UUID, sms_number_order_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_sms_number_order_without_code(UUID, sms_number_order_status, TEXT) TO service_role;

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
      AND o.charged_ngn > 0
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
    ORDER BY o.created_at ASC
  LOOP
    v_refund_amount := sms_order_refundable_ngn(v_order);
    IF v_refund_amount IS NULL OR v_refund_amount <= 0 THEN
      v_refund_amount := v_order.charged_ngn;
    END IF;
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

GRANT EXECUTE ON FUNCTION repair_unrefunded_sms_orders() TO service_role;

-- Repair any charged SMS orders that never received a code and were never refunded.
SELECT repair_unrefunded_sms_orders();
