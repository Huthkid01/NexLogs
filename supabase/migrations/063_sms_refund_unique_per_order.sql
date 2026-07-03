-- Block duplicate SMS cancel refunds at the database level.
-- Cleans up existing duplicate refund rows first, then adds the unique index.

-- 1. Reverse duplicate refund credits in wallet balances (keeps earliest refund per order).
SELECT repair_duplicate_sms_refunds();

-- 2. Void duplicate refund ledger rows so only one completed refund remains per order.
WITH ranked_refunds AS (
  SELECT
    wt.id,
    ROW_NUMBER() OVER (
      PARTITION BY wt.user_id, wt.metadata->>'order_id'
      ORDER BY wt.created_at ASC, wt.id ASC
    ) AS row_num
  FROM wallet_transactions wt
  WHERE wt.status = 'completed'
    AND wt.metadata->>'source' = 'sms_number_refund'
    AND NULLIF(btrim(COALESCE(wt.metadata->>'order_id', '')), '') IS NOT NULL
)
UPDATE wallet_transactions wt
SET
  status = 'failed',
  metadata = COALESCE(wt.metadata, '{}'::jsonb) || jsonb_build_object(
    'voided_reason', 'duplicate_sms_refund',
    'voided_at', NOW()
  ),
  updated_at = NOW()
FROM ranked_refunds rr
WHERE wt.id = rr.id
  AND rr.row_num > 1;

-- 3. Mark any still-active orders that already have a refund as cancelled.
UPDATE sms_number_orders o
SET
  status = 'cancelled',
  metadata = COALESCE(o.metadata, '{}'::jsonb) || jsonb_build_object(
    'refund_wallet_transaction_id', kept.refund_tx_id,
    'cancelled_at', NOW()
  ),
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (wt.metadata->>'order_id')
    (wt.metadata->>'order_id')::UUID AS order_id,
    wt.id AS refund_tx_id
  FROM wallet_transactions wt
  WHERE wt.status = 'completed'
    AND wt.metadata->>'source' = 'sms_number_refund'
    AND NULLIF(btrim(COALESCE(wt.metadata->>'order_id', '')), '') IS NOT NULL
  ORDER BY wt.metadata->>'order_id', wt.created_at ASC, wt.id ASC
) kept
WHERE o.id = kept.order_id
  AND o.status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS wallet_sms_refund_order_unique
  ON wallet_transactions ((metadata->>'order_id'))
  WHERE (metadata->>'source') = 'sms_number_refund'
    AND status = 'completed'
    AND NULLIF(btrim(metadata->>'order_id'), '') IS NOT NULL;

COMMENT ON INDEX wallet_sms_refund_order_unique
  IS 'Ensures at most one completed SMS refund wallet transaction per sms_number_orders.id.';
