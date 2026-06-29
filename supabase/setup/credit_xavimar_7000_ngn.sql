-- Credit xavimar744@gmail.com — Kora ref NEX-37f76f23-1782686828308-01B9112C3E4F
-- 7000 NGN @ 1450 = $4.83 USD
-- Run in Supabase Dashboard → SQL Editor

DO $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
  v_amount NUMERIC := ROUND(7000.0 / 1450.0, 2); -- 4.83 USD
  v_kora_ref TEXT := 'NEX-37f76f23-1782686828308-01B9112C3E4F';
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE lower(email) = lower('xavimar744@gmail.com');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: xavimar744@gmail.com';
  END IF;

  -- Idempotent: skip if this Kora payment was already credited
  SELECT wt.id INTO v_tx_id
  FROM wallet_transactions wt
  WHERE wt.user_id = v_user_id
    AND wt.metadata->>'tx_ref' = v_kora_ref
  LIMIT 1;

  IF v_tx_id IS NOT NULL THEN
    RAISE NOTICE 'Already credited for Kora ref %. Transaction id: %', v_kora_ref, v_tx_id;
    RETURN;
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'DEP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'deposit',
    'kora_card',
    v_amount,
    'USD',
    'completed',
    jsonb_build_object(
      'reason', 'Manual credit: Kora payment verified in dashboard',
      'source', 'admin_manual_credit',
      'provider', 'kora',
      'original_amount', 7000,
      'original_currency', 'NGN',
      'exchange_rate', 1450,
      'tx_ref', v_kora_ref,
      'kora_reference', v_kora_ref
    )
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + v_amount
  WHERE user_id = v_user_id;

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_user_id,
    'wallet_deposit_completed',
    'wallet',
    v_tx_id,
    jsonb_build_object(
      'amount_usd', v_amount,
      'kora_ref', v_kora_ref,
      'email', 'xavimar744@gmail.com',
      'note', 'Admin manual credit after Kora success'
    )
  );

  RAISE NOTICE 'Credited % USD to xavimar744@gmail.com for Kora ref %', v_amount, v_kora_ref;
END $$;

-- Verify
SELECT p.email, p.id, w.balance AS balance_usd
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
WHERE lower(p.email) = lower('xavimar744@gmail.com');

SELECT wt.ref, wt.kind, wt.amount AS usd, wt.metadata->>'tx_ref' AS kora_ref, wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON p.id = wt.user_id
WHERE lower(p.email) = lower('xavimar744@gmail.com')
ORDER BY wt.created_at DESC
LIMIT 5;
