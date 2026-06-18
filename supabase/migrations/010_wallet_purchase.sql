CREATE OR REPLACE FUNCTION wallet_deposit(p_amount_usd NUMERIC, p_original_amount NUMERIC, p_currency TEXT, p_payment_method TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'DEP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'deposit',
    COALESCE(NULLIF(p_payment_method, ''), 'card'),
    p_amount_usd,
    'USD',
    'completed',
    jsonb_build_object(
      'original_amount', p_original_amount,
      'original_currency', p_currency
    )
  )
  RETURNING id INTO v_tx_id;

  UPDATE wallets
  SET balance = balance + p_amount_usd
  WHERE user_id = v_user_id;

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_user_id,
    'wallet_deposit_completed',
    'wallet',
    v_tx_id,
    jsonb_build_object('amount_usd', p_amount_usd)
  );

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION purchase_product_with_wallet(p_product_id UUID, p_quantity INT DEFAULT 1)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_price NUMERIC;
  v_total NUMERIC;
  v_stock INT;
  v_order_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity' USING ERRCODE = '22023';
  END IF;

  SELECT price, stock
  INTO v_price, v_stock
  FROM products
  WHERE id = p_product_id AND is_active = TRUE
  FOR UPDATE;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Out of stock' USING ERRCODE = 'P0001';
  END IF;

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

  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = p_product_id;

  INSERT INTO orders (user_id, total_amount, discount_amount, status, payment_status)
  VALUES (v_user_id, v_total, 0, 'completed', 'paid')
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, price)
  VALUES (v_order_id, p_product_id, p_quantity, v_price);

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'PUR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'purchase',
    'wallet',
    v_total,
    'USD',
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
    jsonb_build_object('transaction_id', v_tx_id, 'amount_usd', v_total)
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
