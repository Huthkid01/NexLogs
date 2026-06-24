-- Purchase + add-funds emails via Edge Function + support@nexlogs.store
-- Run in Supabase SQL Editor (or use hostinger_transactional_emails_ready.sql)

INSERT INTO app_config (key, value) VALUES
  ('email_webhook_secret', 'REPLACE_WITH_SAME_AS_EDGE_FUNCTION_EMAIL_WEBHOOK_SECRET'),
  ('supabase_functions_base', 'https://opmjctjzwkvwsxenddfi.supabase.co/functions/v1')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- Ensure triggers are active
DROP TRIGGER IF EXISTS wallet_transactions_send_deposit_email ON wallet_transactions;
CREATE TRIGGER wallet_transactions_send_deposit_email
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_wallet_deposit_email();

DROP TRIGGER IF EXISTS orders_send_purchase_email ON orders;
CREATE TRIGGER orders_send_purchase_email
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_purchase_email();
