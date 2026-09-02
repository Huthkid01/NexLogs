-- Fix RDP purchases charging a different amount than the UI shows.
-- Root cause: ensure_rdp_product_from_catalog overwrote products.price from site_content
-- on every purchase, while the client displayed products.price from the catalog API.

CREATE OR REPLACE FUNCTION ensure_rdp_product_from_catalog(p_product_slug TEXT)
RETURNS UUID AS $$
DECLARE
  v_plan_title TEXT;
  v_plan_price NUMERIC;
  v_months INT;
  v_category_id UUID;
  v_product_id UUID;
  v_description TEXT;
BEGIN
  IF p_product_slug IS NULL OR p_product_slug !~ '-rdp-[0-9]+gb-[0-9]+-month$' THEN
    RAISE EXCEPTION 'Invalid RDP product slug' USING ERRCODE = '22023';
  END IF;

  SELECT id
  INTO v_product_id
  FROM products
  WHERE slug = p_product_slug
  LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    RETURN v_product_id;
  END IF;

  v_months := (regexp_match(p_product_slug, '-([0-9]+)-month$'))[1]::INT;

  SELECT
    plan.elem->>'title',
    round(((plan.elem->>'priceUsdMonthly')::numeric * (dur.elem->>'months')::numeric), 2),
    COALESCE(
      NULLIF(trim(plan.elem->>'title'), '') || ' (' || (plan.elem->>'ramLabel') || ') - ' || (dur.elem->>'label'),
      plan.elem->>'title'
    )
  INTO v_plan_title, v_plan_price, v_description
  FROM site_content_blocks scb
  CROSS JOIN LATERAL jsonb_array_elements(scb.value->'plans') AS plan(elem)
  CROSS JOIN LATERAL jsonb_array_elements(scb.value->'durations') AS dur(elem)
  WHERE scb.key = 'rdp'
    AND (plan.elem->>'productSlug') || '-' || (dur.elem->>'months') || '-month' = p_product_slug
  LIMIT 1;

  IF v_plan_title IS NULL THEN
    RAISE EXCEPTION 'RDP plan not found. Save your RDP catalog in Admin -> RDP Plans first.' USING ERRCODE = 'P0002';
  END IF;

  v_category_id := get_or_create_rdp_category_id();
  v_description := COALESCE(v_description, v_plan_title) || E'\n\nPurchased via Purchase RDP.';

  INSERT INTO products (
    title,
    slug,
    description,
    platform,
    price,
    stock,
    category_id,
    is_active,
    featured,
    niche
  )
  VALUES (
    v_plan_title || ' (' || v_months || ' Month)',
    p_product_slug,
    v_description,
    'x',
    v_plan_price,
    99999,
    v_category_id,
    TRUE,
    FALSE,
    'RDP'
  )
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_total := ROUND(v_price * p_quantity, 2);

  IF v_balance + 0.001 < v_total THEN
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
    'NGN',
    'completed',
    jsonb_build_object(
      'order_id', v_order_id,
      'product_id', p_product_id,
      'quantity', p_quantity,
      'fulfillment', 'manual_rdp',
      'amount_ngn', v_total
    )
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
    jsonb_build_object('transaction_id', v_tx_id, 'amount_ngn', v_total)
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ensure_rdp_product_from_catalog(TEXT)
  IS 'Resolve RDP product by slug. Uses existing products.price; only creates missing rows from site_content.';
