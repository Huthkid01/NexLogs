-- RDP purchases: deduct wallet, create order with empty delivered_details for admin fulfillment
CREATE OR REPLACE FUNCTION purchase_rdp_with_wallet(p_product_id UUID, p_quantity INT DEFAULT 1)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_price NUMERIC;
  v_total NUMERIC;
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

  SELECT price
  INTO v_price
  FROM products
  WHERE id = p_product_id AND is_active = TRUE
  FOR UPDATE;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
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

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Wallet update failed' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO orders (user_id, total_amount, discount_amount, status, payment_status)
  VALUES (v_user_id, v_total, 0, 'processing', 'paid')
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, price, delivered_details)
  VALUES (v_order_id, p_product_id, p_quantity, v_price, NULL);

  INSERT INTO wallet_transactions (user_id, ref, kind, payment_method, amount, currency, status, metadata)
  VALUES (
    v_user_id,
    'RDP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 10)),
    'purchase',
    'wallet',
    v_total,
    'USD',
    'completed',
    jsonb_build_object('order_id', v_order_id, 'product_id', p_product_id, 'quantity', p_quantity, 'fulfillment', 'manual_rdp')
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO notifications (user_id, title, message, link)
  VALUES (
    v_user_id,
    'RDP Purchase Completed',
    'Purchase completed. Check your purchase history within 5 to 10 mins for details.',
    '/purchases'
  );

  INSERT INTO activity_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_user_id,
    'rdp_purchase_completed',
    'order',
    v_order_id,
    jsonb_build_object('transaction_id', v_tx_id, 'amount_usd', v_total)
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION purchase_rdp_with_wallet(UUID, INT) TO authenticated;
