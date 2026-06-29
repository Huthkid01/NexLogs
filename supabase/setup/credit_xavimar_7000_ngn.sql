-- One-time credit: xavimar744@gmail.com — 7000 NGN
-- Run in Supabase Dashboard → SQL Editor (as project owner)
-- Safe to re-run: skips if this adjustment ref already exists

DO $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
  v_amount NUMERIC := 7000;
  v_external_ref TEXT := 'MANUAL-KORA-7000NGN-xavimar744';
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE lower(email) = lower('xavimar744@gmail.com');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: xavimar744@gmail.com';
  END IF;

  SELECT wt.id INTO v_tx_id
  FROM wallet_transactions wt
  WHERE wt.user_id = v_user_id
    AND wt.metadata->>'tx_ref' = v_external_ref
  LIMIT 1;

  IF v_tx_id IS NOT NULL THEN
    RAISE NOTICE 'Already credited. Transaction id: %', v_tx_id;
    PERFORM reconcile_wallet_balances();
    RETURN;
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'ADJ-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'adjustment',
    'admin',
    v_amount,
    'NGN',
    'completed',
    jsonb_build_object(
      'reason', 'Manual credit: Kora 7000 NGN deposit verified',
      'source', 'admin_manual_credit',
      'original_amount', 7000,
      'original_currency', 'NGN',
      'tx_ref', v_external_ref
    )
  )
  RETURNING id INTO v_tx_id;

  PERFORM reconcile_wallet_balances();

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_user_id,
    'wallet_admin_credit',
    'wallet',
    v_tx_id,
    jsonb_build_object(
      'amount_ngn', v_amount,
      'reason', 'Kora 7000 NGN',
      'email', 'xavimar744@gmail.com'
    )
  );

  RAISE NOTICE 'Credited % NGN to xavimar744@gmail.com (tx %)', v_amount, v_tx_id;
END $$;

-- Verify after running:
SELECT p.email, w.balance AS balance_ngn
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
WHERE lower(p.email) = lower('xavimar744@gmail.com');

SELECT wt.ref, wt.kind, wt.amount, wt.currency, wt.metadata, wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON p.id = wt.user_id
WHERE lower(p.email) = lower('xavimar744@gmail.com')
ORDER BY wt.created_at DESC
LIMIT 5;
