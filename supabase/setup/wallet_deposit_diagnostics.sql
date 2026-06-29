-- Wallet deposit diagnostics — run in Supabase SQL Editor
-- Use to investigate missing Kora deposits (e.g. 7000 NGN not showing in wallet)

-- 1) Find user by email (replace with the customer's email)
SELECT id, email, full_name, created_at
FROM profiles
WHERE email ILIKE '%REPLACE_WITH_USER_EMAIL%';

-- 2) User wallet balance
SELECT w.user_id, p.email, w.balance, w.updated_at
FROM wallets w
JOIN profiles p ON p.id = w.user_id
WHERE p.email ILIKE '%REPLACE_WITH_USER_EMAIL%';

-- 3) All wallet transactions for that user (deposits, purchases, adjustments)
SELECT
  wt.id,
  wt.ref,
  wt.kind,
  wt.payment_method,
  wt.amount AS amount_ngn,
  wt.currency,
  wt.status,
  wt.metadata->>'tx_ref' AS kora_ref,
  wt.metadata->>'original_amount' AS original_amount,
  wt.metadata->>'original_currency' AS original_currency,
  wt.metadata->>'provider' AS provider,
  wt.metadata->>'reason' AS admin_reason,
  wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON p.id = wt.user_id
WHERE p.email ILIKE '%REPLACE_WITH_USER_EMAIL%'
ORDER BY wt.created_at DESC;

-- 4) Search for 7000 NGN deposits across all users (recent)
SELECT
  p.email,
  p.full_name,
  wt.amount AS amount_ngn,
  wt.metadata->>'original_amount' AS original_amount,
  wt.metadata->>'original_currency' AS original_currency,
  wt.metadata->>'tx_ref' AS kora_ref,
  wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON p.id = wt.user_id
WHERE wt.kind IN ('deposit', 'adjustment')
  AND wt.status = 'completed'
  AND (
    (wt.metadata->>'original_currency' = 'NGN' AND (wt.metadata->>'original_amount')::numeric = 7000)
    OR wt.metadata->>'charged_amount' = '7000'
    OR wt.amount = 7000
    OR wt.amount BETWEEN 4.00 AND 5.50  -- legacy USD rows before NGN migration
  )
ORDER BY wt.created_at DESC
LIMIT 20;

-- 5) Recent Kora deposits (all users, last 7 days)
SELECT
  p.email,
  wt.amount AS amount_ngn,
  wt.metadata->>'original_amount' AS paid_amount,
  wt.metadata->>'original_currency' AS paid_currency,
  wt.metadata->>'tx_ref' AS merchant_ref,
  wt.metadata->>'kora_reference' AS kora_reference,
  wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON p.id = wt.user_id
WHERE wt.kind = 'deposit'
  AND wt.metadata->>'provider' = 'kora'
  AND wt.created_at > NOW() - INTERVAL '7 days'
ORDER BY wt.created_at DESC;

-- 6) Users with zero balance but no deposit history (possible failed verification)
SELECT p.email, p.full_name, COALESCE(w.balance, 0) AS balance
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
WHERE p.role <> 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.user_id = p.id AND wt.kind = 'deposit' AND wt.status = 'completed'
  )
ORDER BY p.created_at DESC
LIMIT 50;
