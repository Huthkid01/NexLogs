-- Purchase RDP by catalog slug: resolve price from site_content, ensure product row, then charge wallet.

CREATE OR REPLACE FUNCTION get_or_create_rdp_category_id()
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM categories WHERE slug = 'rdp' LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO categories (name, slug, description, is_active, sort_order)
    VALUES ('RDP', 'rdp', 'Remote Desktop Plans', TRUE, 9999)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

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
    SELECT id, price, title
    INTO v_product_id, v_plan_price, v_plan_title
    FROM products
    WHERE slug = p_product_slug
    LIMIT 1;

    IF v_product_id IS NOT NULL THEN
      RETURN v_product_id;
    END IF;

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
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    niche = EXCLUDED.niche,
    is_active = TRUE,
    updated_at = NOW()
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION purchase_rdp_with_wallet_by_slug(p_product_slug TEXT, p_quantity INT DEFAULT 1)
RETURNS UUID AS $$
DECLARE
  v_product_id UUID;
BEGIN
  v_product_id := ensure_rdp_product_from_catalog(p_product_slug);
  RETURN purchase_rdp_with_wallet(v_product_id, p_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_or_create_rdp_category_id() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_rdp_product_from_catalog(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_rdp_with_wallet_by_slug(TEXT, INT) TO authenticated;
