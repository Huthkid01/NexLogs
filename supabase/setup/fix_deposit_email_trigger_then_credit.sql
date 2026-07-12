-- =============================================================================
-- RUN THIS FIRST — fixes deposit credit failing with queue_user_email error
-- =============================================================================
-- Copy/paste the contents of:
--   supabase/migrations/078_fix_queue_user_email_ambiguity.sql
-- Then run the credit query below.

-- =============================================================================
-- THEN credit Timidex (Kora ref KORA-1783884278898-9715E3A72725)
-- =============================================================================
SELECT complete_wallet_payment_intent(
  'kora'::wallet_payment_provider,
  'KORA-1783884278898-9715E3A72725',
  5000,
  5100,
  'NGN',
  'kora',
  NULL,
  '{"source": "manual_admin_recovery", "kora_status": "successful"}'::jsonb
) AS new_wallet_transaction_id;

SELECT p.email, w.balance, i.status, i.wallet_transaction_id
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
LEFT JOIN wallet_payment_intents i ON i.reference = 'KORA-1783884278898-9715E3A72725'
WHERE p.email ILIKE 'Timidex00@gmail.com';
