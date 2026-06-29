-- Fix inflated or incorrect wallet balances for all users.
-- Run in Supabase Dashboard → SQL Editor (as project owner).
-- Safe to re-run.

SELECT reconcile_wallet_balances() AS wallets_updated;

-- Spot-check a user (replace email):
SELECT p.email, w.balance AS balance_ngn
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
WHERE lower(p.email) = lower('xavimar744@gmail.com');

SELECT wt.ref, wt.kind, wt.amount, wt.currency, wt.metadata, wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON p.id = wt.user_id
WHERE lower(p.email) = lower('xavimar744@gmail.com')
ORDER BY wt.created_at DESC;
