-- Re-enable purchase + add-funds emails via hosted email API (Render + Hostinger SMTP).
-- Auth emails (signup, reset) stay on Supabase Auth — no welcome trigger here.

DROP TRIGGER IF EXISTS orders_send_purchase_email ON orders;
CREATE TRIGGER orders_send_purchase_email
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_purchase_email();

DROP TRIGGER IF EXISTS wallet_transactions_send_deposit_email ON wallet_transactions;
CREATE TRIGGER wallet_transactions_send_deposit_email
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_wallet_deposit_email();

-- After deploying Render, run supabase/setup/render_transactional_emails.sql
