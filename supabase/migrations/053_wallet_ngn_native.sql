-- Convert wallet, products, and orders from USD-equivalent amounts to NGN.
-- p_amount_usd parameter names are kept for RPC compatibility but values are NGN.
-- Safe to re-run: skips amount scaling if NGN transactions already exist.

DO $$
DECLARE
  v_rate NUMERIC;
  v_rdp JSONB;
  v_plans JSONB;
  v_already_migrated BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM wallet_transactions
    WHERE currency = 'NGN'
    LIMIT 1
  ) INTO v_already_migrated;

  IF v_already_migrated THEN
    RAISE NOTICE '053_wallet_ngn_native: data conversion already applied, skipping amount scaling.';
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(value->'exchangeRates'->>'NGN', '')::NUMERIC, 1450)
  INTO v_rate
  FROM site_content_blocks
  WHERE key = 'wallet'
  LIMIT 1;

  IF v_rate IS NULL OR v_rate <= 0 THEN
    v_rate := 1450;
  END IF;

  -- Wallet balances are reconciled from the transaction ledger in migration 054.
  -- Do not multiply wallets.balance here (causes inflated balances when mixed USD/NGN).

  UPDATE products
  SET price = ROUND(price * v_rate, 2)
  WHERE price <> 0;

  UPDATE orders
  SET total_amount = ROUND(total_amount * v_rate, 2)
  WHERE total_amount <> 0;

  UPDATE order_items
  SET price = ROUND(price * v_rate, 2)
  WHERE price <> 0;

  UPDATE wallet_transactions
  SET
    amount = ROUND(amount * v_rate, 2),
    currency = 'NGN'
  WHERE COALESCE(currency, 'USD') = 'USD';

  UPDATE coupons
  SET min_purchase = ROUND(min_purchase * v_rate, 2)
  WHERE min_purchase IS NOT NULL AND min_purchase > 0;

  SELECT value INTO v_rdp FROM site_content_blocks WHERE key = 'rdp' LIMIT 1;
  IF v_rdp IS NOT NULL AND jsonb_typeof(v_rdp->'plans') = 'array' THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_set(
          plan,
          '{priceUsdMonthly}',
          to_jsonb(ROUND((plan->>'priceUsdMonthly')::NUMERIC * v_rate, 2))
        )
      ),
      '[]'::jsonb
    )
    INTO v_plans
    FROM jsonb_array_elements(v_rdp->'plans') AS plan;

    UPDATE site_content_blocks
    SET value = jsonb_set(v_rdp, '{plans}', v_plans)
    WHERE key = 'rdp';
  END IF;
END $$;

-- Remove legacy 4-arg overload so grants/comments are unambiguous.
DROP FUNCTION IF EXISTS wallet_deposit(NUMERIC, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION wallet_deposit(
  p_amount_usd NUMERIC,
  p_original_amount NUMERIC,
  p_currency TEXT,
  p_payment_method TEXT,
  p_external_ref TEXT DEFAULT NULL,
  p_provider_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
  v_amount_ngn NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  v_amount_ngn := p_amount_usd;
  IF v_amount_ngn IS NULL OR v_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  IF p_external_ref IS NOT NULL AND btrim(p_external_ref) <> '' THEN
    SELECT wt.id INTO v_tx_id
    FROM wallet_transactions wt
    WHERE wt.user_id = v_user_id
      AND wt.metadata->>'tx_ref' = p_external_ref
    LIMIT 1;

    IF v_tx_id IS NOT NULL THEN
      RETURN v_tx_id;
    END IF;
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'DEP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'deposit',
    COALESCE(NULLIF(p_payment_method, ''), 'card'),
    v_amount_ngn,
    'NGN',
    'completed',
    jsonb_build_object(
      'original_amount', p_original_amount,
      'original_currency', COALESCE(NULLIF(p_currency, ''), 'NGN')
    ) || COALESCE(p_provider_metadata, '{}'::jsonb)
      || CASE
           WHEN p_external_ref IS NOT NULL AND btrim(p_external_ref) <> '' THEN
             jsonb_build_object('tx_ref', p_external_ref)
           ELSE '{}'::jsonb
         END
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + v_amount_ngn
  WHERE user_id = v_user_id;

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_user_id,
    'wallet_deposit_completed',
    'wallet',
    v_tx_id,
    jsonb_build_object('amount_ngn', v_amount_ngn)
  );

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_credit_wallet(
  p_user_id UUID,
  p_amount_usd NUMERIC,
  p_reason TEXT,
  p_external_ref TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_tx_id UUID;
  v_reason TEXT;
  v_amount_ngn NUMERIC;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required' USING ERRCODE = '22023';
  END IF;

  v_amount_ngn := p_amount_usd;
  IF v_amount_ngn IS NULL OR v_amount_ngn <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero' USING ERRCODE = '22023';
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Reason is required' USING ERRCODE = '22023';
  END IF;

  IF p_external_ref IS NOT NULL AND btrim(p_external_ref) <> '' THEN
    SELECT wt.id INTO v_tx_id
    FROM wallet_transactions wt
    WHERE wt.user_id = p_user_id
      AND wt.metadata->>'tx_ref' = btrim(p_external_ref)
    LIMIT 1;

    IF v_tx_id IS NOT NULL THEN
      RETURN v_tx_id;
    END IF;
  END IF;

  INSERT INTO wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    p_user_id,
    'ADJ-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'adjustment',
    'admin',
    v_amount_ngn,
    'NGN',
    'completed',
    jsonb_build_object(
      'reason', v_reason,
      'credited_by', v_admin_id,
      'source', 'admin_manual_credit'
    ) || CASE
      WHEN p_external_ref IS NOT NULL AND btrim(p_external_ref) <> '' THEN
        jsonb_build_object('tx_ref', btrim(p_external_ref))
      ELSE '{}'::jsonb
    END
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + v_amount_ngn
  WHERE user_id = p_user_id;

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    p_user_id,
    'wallet_admin_credit',
    'wallet',
    v_tx_id,
    jsonb_build_object(
      'amount_ngn', v_amount_ngn,
      'reason', v_reason,
      'credited_by', v_admin_id,
      'external_ref', NULLIF(btrim(COALESCE(p_external_ref, '')), '')
    )
  );

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate purchase function with NGN transaction currency and per-buyer detail allocation.
CREATE OR REPLACE FUNCTION purchase_product_with_wallet(p_product_id UUID, p_quantity INT DEFAULT 1)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_price NUMERIC;
  v_total NUMERIC;
  v_stock INT;
  v_product_details TEXT;
  v_lines TEXT[];
  v_delivered_lines TEXT[];
  v_remaining_lines TEXT[];
  v_delivered TEXT;
  v_remaining TEXT;
  v_order_id UUID;
  v_tx_id UUID;
  v_rows INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT price, stock, product_details
  INTO v_price, v_stock, v_product_details
  FROM products
  WHERE id = p_product_id AND is_active = TRUE
  FOR UPDATE;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  v_lines := parse_product_detail_items(v_product_details);

  IF COALESCE(array_length(v_lines, 1), 0) < p_quantity THEN
    RAISE EXCEPTION 'Out of stock' USING ERRCODE = 'P0001';
  END IF;

  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Out of stock' USING ERRCODE = 'P0001';
  END IF;

  v_delivered_lines := v_lines[1:p_quantity];
  IF p_quantity = array_length(v_lines, 1) THEN
    v_remaining_lines := ARRAY[]::TEXT[];
  ELSE
    v_remaining_lines := v_lines[p_quantity + 1:array_length(v_lines, 1)];
  END IF;

  v_delivered := array_to_string(v_delivered_lines, E'\n\n');
  v_remaining := NULLIF(array_to_string(v_remaining_lines, E'\n<<<ITEM>>>\n'), '');

  SELECT balance
  INTO v_balance
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  v_total := v_price * p_quantity;

  IF v_balance < v_total THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS' USING ERRCODE = 'P0001';
  END IF;

  UPDATE wallets
  SET balance = balance - v_total
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Wallet update failed' USING ERRCODE = 'P0001';
  END IF;

  UPDATE products
  SET
    stock = COALESCE(array_length(v_remaining_lines, 1), 0),
    product_details = v_remaining
  WHERE id = p_product_id;

  INSERT INTO orders (user_id, total_amount, discount_amount, status, payment_status)
  VALUES (v_user_id, v_total, 0, 'completed', 'paid')
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, price, delivered_details)
  VALUES (v_order_id, p_product_id, p_quantity, v_price, v_delivered);

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'PUR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'purchase',
    'wallet',
    v_total,
    'NGN',
    'completed',
    jsonb_build_object('order_id', v_order_id, 'product_id', p_product_id, 'quantity', p_quantity)
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO notifications (user_id, title, message, link)
  VALUES (
    v_user_id,
    'Purchase Completed',
    'Your purchase has been completed successfully.',
    '/purchases'
  );

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_user_id,
    'wallet_purchase_completed',
    'order',
    v_order_id,
    jsonb_build_object('transaction_id', v_tx_id, 'amount_ngn', v_total)
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION wallet_deposit(NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_credit_wallet(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_product_with_wallet(UUID, INT) TO authenticated;

COMMENT ON FUNCTION wallet_deposit(NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB)
  IS 'Credits wallet in NGN. p_amount_usd param stores the NGN amount for backward compatibility.';
COMMENT ON FUNCTION admin_credit_wallet(UUID, NUMERIC, TEXT, TEXT)
  IS 'Admin manual wallet credit in NGN. p_amount_usd param stores the NGN amount for backward compatibility.';
