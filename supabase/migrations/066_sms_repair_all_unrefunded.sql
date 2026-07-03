-- Refund every SMS order that was charged but never delivered a valid verification code.
-- Covers NULL codes (expired/cancelled without sync) as well as invalid placeholders like "0".

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
        'reason', 'SMS order refunded — no valid verification code received',
        'order_id', v_order.id,
        'smspool_order_id', v_order.smspool_order_id,
        'auto_refund', true,
        'repair', 'repair_unrefunded_sms_orders'
      )
    )
    RETURNING id INTO v_refund_tx_id;

    UPDATE wallets
    SET balance = balance + v_order.charged_ngn
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
        'auto_refund_reason', 'No valid verification code received'
      ),
      updated_at = NOW()
    WHERE id = v_order.id;

    repaired_order_id := v_order.id;
    repaired_user_id := v_order.user_id;
    refunded_ngn := v_order.charged_ngn;
    refund_transaction_id := v_refund_tx_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION repair_unrefunded_sms_orders() TO service_role;

SELECT * FROM repair_unrefunded_sms_orders();

COMMENT ON FUNCTION repair_unrefunded_sms_orders()
  IS 'One-time/idempotent repair: refund SMS orders charged without delivering a valid code.';
