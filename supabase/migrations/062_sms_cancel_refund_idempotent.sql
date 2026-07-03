-- Atomic, idempotent SMS order cancel + single wallet refund.
-- Prevents duplicate refunds when cancel is clicked multiple times.

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

  IF v_order.status IN ('cancelled', 'refunded') THEN
    IF v_refund_tx_id IS NOT NULL THEN
      RETURN v_refund_tx_id;
    END IF;
    RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE' USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status <> 'active' THEN
    RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE' USING ERRCODE = 'P0001';
  END IF;

  IF v_refund_tx_id IS NOT NULL THEN
    UPDATE sms_number_orders
    SET
      status = 'cancelled',
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
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'refund_wallet_transaction_id', v_refund_tx_id,
      'cancelled_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_refund_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_sms_number_order_and_refund(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION cancel_sms_number_order_and_refund(UUID, TEXT)
  IS 'Cancel an active SMS number order and refund the wallet once. Idempotent for repeated calls.';

-- One-time repair: remove duplicate SMS cancel refunds (keeps earliest refund per order).
CREATE OR REPLACE FUNCTION repair_duplicate_sms_refunds()
RETURNS TABLE (
  repaired_user_id UUID,
  repaired_order_id UUID,
  duplicate_count INTEGER,
  reversed_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_keep_id UUID;
  v_duplicate_total NUMERIC;
  v_duplicate_count INTEGER;
  v_tx_id UUID;
BEGIN
  FOR v_row IN
    SELECT
      wt.user_id,
      (wt.metadata->>'order_id')::UUID AS order_id
    FROM wallet_transactions wt
    WHERE wt.status = 'completed'
      AND wt.metadata->>'source' = 'sms_number_refund'
      AND NULLIF(btrim(COALESCE(wt.metadata->>'order_id', '')), '') IS NOT NULL
    GROUP BY wt.user_id, wt.metadata->>'order_id'
    HAVING COUNT(*) > 1
  LOOP
    SELECT wt.id INTO v_keep_id
    FROM wallet_transactions wt
    WHERE wt.user_id = v_row.user_id
      AND wt.metadata->>'order_id' = v_row.order_id::TEXT
      AND wt.metadata->>'source' = 'sms_number_refund'
      AND wt.status = 'completed'
    ORDER BY wt.created_at ASC
    LIMIT 1;

    SELECT
      COUNT(*) - 1,
      COALESCE(SUM(wt.amount), 0) - COALESCE(MAX(CASE WHEN wt.id = v_keep_id THEN wt.amount END), 0)
    INTO v_duplicate_count, v_duplicate_total
    FROM wallet_transactions wt
    WHERE wt.user_id = v_row.user_id
      AND wt.metadata->>'order_id' = v_row.order_id::TEXT
      AND wt.metadata->>'source' = 'sms_number_refund'
      AND wt.status = 'completed';

    IF v_duplicate_total <= 0 OR v_duplicate_count <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
    VALUES (
      v_row.user_id,
      'SMSFIX-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
      'purchase',
      'admin',
      v_duplicate_total,
      'NGN',
      'completed',
      jsonb_build_object(
        'source', 'duplicate_sms_refund_correction',
        'order_id', v_row.order_id,
        'kept_refund_transaction_id', v_keep_id
      )
    )
    RETURNING id INTO v_tx_id;

    UPDATE wallets
    SET balance = balance - v_duplicate_total
    WHERE user_id = v_row.user_id;

    UPDATE sms_number_orders
    SET
      status = 'cancelled',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_wallet_transaction_id', v_keep_id
      ),
      updated_at = NOW()
    WHERE id = v_row.order_id
      AND status = 'active';

    repaired_user_id := v_row.user_id;
    repaired_order_id := v_row.order_id;
    duplicate_count := v_duplicate_count;
    reversed_amount := v_duplicate_total;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION repair_duplicate_sms_refunds() TO service_role;

COMMENT ON FUNCTION repair_duplicate_sms_refunds()
  IS 'Reverse duplicate SMS cancel refunds and mark affected orders cancelled. Run once via service role.';
