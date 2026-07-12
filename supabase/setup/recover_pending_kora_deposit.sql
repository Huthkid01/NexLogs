-- =============================================================================
-- Recover Timidex pending Kora deposit (run ONE section at a time in SQL Editor)
-- =============================================================================

-- STEP 1 — Check the payment intent still exists and is pending
SELECT
  p.email,
  i.reference,
  i.expected_amount_ngn,
  i.charge_amount,
  i.status,
  i.wallet_transaction_id,
  i.created_at
FROM wallet_payment_intents i
JOIN profiles p ON p.id = i.user_id
WHERE i.reference = 'KORA-1783884278898-9715E3A72725';

-- Expected: status = pending, wallet_transaction_id = NULL
-- If status = succeeded → already credited (check wallets.balance below)
-- If no rows → wrong reference


-- STEP 2 — Check if recovery function exists (migration 071)
SELECT EXISTS (
  SELECT 1
  FROM pg_proc
  WHERE proname = 'complete_wallet_payment_intent'
) AS recovery_function_exists;

-- If false → run migration 071 first:
--   supabase db push   (or paste supabase/migrations/071_wallet_payment_intents.sql)


-- STEP 3 — Credit the wallet (run ONLY this block after Step 1 shows pending)
SELECT complete_wallet_payment_intent(
  'kora'::wallet_payment_provider,
  'KORA-1783884278898-9715E3A72725',
  5000,
  5100,
  'NGN',
  'kora',
  NULL,
  '{"source": "manual_admin_recovery", "note": "Kora paid but webhook/verify missed"}'::jsonb
) AS new_wallet_transaction_id;

-- SUCCESS = one UUID returned (e.g. a1b2c3d4-...)
-- ERROR examples:
--   PAYMENT_INTENT_NOT_FOUND → reference wrong or intent deleted
--   function does not exist → migration 071 missing
--   duplicate / already has wallet_transaction_id → already credited


-- STEP 4 — Confirm user balance
SELECT
  p.email,
  w.balance AS wallet_balance_ngn,
  i.status AS intent_status,
  i.wallet_transaction_id
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
LEFT JOIN wallet_payment_intents i
  ON i.user_id = p.id AND i.reference = 'KORA-1783884278898-9715E3A72725'
WHERE p.email ILIKE 'Timidex00@gmail.com';


-- =============================================================================
-- FALLBACK — only if Step 3 fails but Kora payment is confirmed successful
-- Run as project owner in SQL Editor. Safe to re-run (skips if already done).
-- =============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_intent_id UUID;
  v_tx_id UUID;
  v_ref TEXT := 'KORA-1783884278898-9715E3A72725';
  v_credit NUMERIC := 5000;
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email ILIKE 'Timidex00@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: Timidex00@gmail.com';
  END IF;

  SELECT id, wallet_transaction_id INTO v_intent_id, v_tx_id
  FROM wallet_payment_intents
  WHERE provider = 'kora' AND reference = v_ref
  FOR UPDATE;

  IF v_intent_id IS NULL THEN
    RAISE EXCEPTION 'Payment intent not found for %', v_ref;
  END IF;

  IF v_tx_id IS NOT NULL THEN
    RAISE NOTICE 'Already credited. wallet_transaction_id = %', v_tx_id;
    RETURN;
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'DEP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'deposit',
    'kora',
    v_credit,
    'NGN',
    'completed',
    jsonb_build_object(
      'tx_ref', v_ref,
      'original_amount', 5100,
      'original_currency', 'NGN',
      'source', 'manual_admin_recovery_fallback'
    )
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets SET balance = balance + v_credit WHERE user_id = v_user_id;

  UPDATE wallet_payment_intents
  SET
    status = 'succeeded',
    wallet_transaction_id = v_tx_id,
    verified_at = NOW(),
    updated_at = NOW()
  WHERE id = v_intent_id;

  RAISE NOTICE 'Credited % NGN. wallet_transaction_id = %', v_credit, v_tx_id;
END $$;

-- Re-run Step 4 to confirm balance after fallback.
