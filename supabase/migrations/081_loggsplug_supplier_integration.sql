-- LOGGSPLUG reseller supplier integration: synced catalog, markup pricing, wallet purchase via edge function.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS supplier_product_id INTEGER,
  ADD COLUMN IF NOT EXISTS supplier_cost_ngn NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS markup_percent_override NUMERIC(6, 2);

CREATE UNIQUE INDEX IF NOT EXISTS products_supplier_product_unique
  ON products (supplier, supplier_product_id)
  WHERE supplier IS NOT NULL AND supplier_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_supplier_idx
  ON products (supplier)
  WHERE supplier IS NOT NULL;

COMMENT ON COLUMN products.supplier IS 'External supplier key, e.g. loggsplug.';
COMMENT ON COLUMN products.supplier_product_id IS 'Supplier catalog product id.';
COMMENT ON COLUMN products.supplier_cost_ngn IS 'Supplier reseller cost in NGN (synced).';
COMMENT ON COLUMN products.markup_percent_override IS 'Optional per-product markup %; null uses site default.';

CREATE TABLE IF NOT EXISTS loggsplug_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  supplier_order_id TEXT NOT NULL,
  supplier_product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  charged_ngn NUMERIC(12, 2) NOT NULL,
  cost_ngn NUMERIC(12, 2) NOT NULL,
  profit_ngn NUMERIC(12, 2) NOT NULL DEFAULT 0,
  marketplace_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loggsplug_orders_user_id_idx ON loggsplug_orders (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS loggsplug_orders_supplier_order_unique ON loggsplug_orders (supplier_order_id);

CREATE TRIGGER loggsplug_orders_updated_at
  BEFORE UPDATE ON loggsplug_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE loggsplug_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loggsplug orders"
  ON loggsplug_orders FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage loggsplug orders"
  ON loggsplug_orders FOR ALL
  USING (is_admin());

CREATE OR REPLACE FUNCTION wallet_debit_for_supplier_purchase(
  p_amount_ngn NUMERIC,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_ngn IS NULL OR p_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  IF v_balance < p_amount_ngn THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS' USING ERRCODE = 'P0001';
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount_ngn
  WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'SUP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'purchase',
    'wallet',
    p_amount_ngn,
    'NGN',
    'completed',
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'supplier_purchase')
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION wallet_refund_supplier_purchase(
  p_amount_ngn NUMERIC,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_ngn IS NULL OR p_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets
  SET balance = balance + p_amount_ngn
  WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'REF-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'refund',
    'wallet',
    p_amount_ngn,
    'NGN',
    'completed',
    jsonb_build_object('reason', COALESCE(p_reason, 'Supplier purchase failed'))
      || COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('source', 'supplier_purchase_refund')
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION wallet_debit_for_supplier_purchase(NUMERIC, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION wallet_debit_for_supplier_purchase(NUMERIC, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION wallet_debit_for_supplier_purchase(NUMERIC, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION wallet_refund_supplier_purchase(NUMERIC, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION wallet_refund_supplier_purchase(NUMERIC, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION wallet_refund_supplier_purchase(NUMERIC, TEXT, JSONB) TO service_role;

INSERT INTO site_content_blocks (key, value)
VALUES (
  'loggsplug',
  jsonb_build_object(
    'enabled', true,
    'defaultMarkupPercent', 15,
    'lastSyncedAt', NULL
  )
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE loggsplug_orders IS 'Audit log for LOGGSPLUG reseller purchases fulfilled via edge function.';
