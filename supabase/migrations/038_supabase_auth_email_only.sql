-- Purchase and wallet emails are not sent via Node when using Supabase Auth + Hostinger SMTP only.
-- Auth emails (signup, reset password) are handled in Supabase Dashboard → Authentication.

DROP TRIGGER IF EXISTS orders_send_purchase_email ON orders;
DROP TRIGGER IF EXISTS wallet_transactions_send_deposit_email ON wallet_transactions;
