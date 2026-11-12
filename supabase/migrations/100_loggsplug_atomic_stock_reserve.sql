-- Atomic stock reserve/restore for Loggsplug purchases (prevents double-sell under concurrency).

CREATE OR REPLACE FUNCTION reserve_loggsplug_product_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INT;
  v_supplier TEXT;
  v_active BOOLEAN;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity' USING ERRCODE = '22023';
  END IF;

  SELECT stock, supplier, is_active
  INTO v_stock, v_supplier, v_active
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_supplier IS DISTINCT FROM 'loggsplug' THEN
    RAISE EXCEPTION 'This product is not supplied by LOGGSPLUG.' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_active, FALSE) IS NOT TRUE OR COALESCE(v_stock, 0) < p_quantity THEN
    RAISE EXCEPTION 'Out of stock' USING ERRCODE = 'P0001';
  END IF;

  UPDATE products
  SET
    stock = v_stock - p_quantity,
    is_active = (v_stock - p_quantity) > 0,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING stock INTO v_stock;

  RETURN v_stock;
END;
$$;

CREATE OR REPLACE FUNCTION restore_loggsplug_product_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INT;
  v_supplier TEXT;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity' USING ERRCODE = '22023';
  END IF;

  SELECT stock, supplier
  INTO v_stock, v_supplier
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_supplier IS DISTINCT FROM 'loggsplug' THEN
    RAISE EXCEPTION 'This product is not supplied by LOGGSPLUG.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE products
  SET
    stock = COALESCE(v_stock, 0) + p_quantity,
    is_active = TRUE,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING stock INTO v_stock;

  RETURN v_stock;
END;
$$;

REVOKE EXECUTE ON FUNCTION reserve_loggsplug_product_stock(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reserve_loggsplug_product_stock(UUID, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION reserve_loggsplug_product_stock(UUID, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION restore_loggsplug_product_stock(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION restore_loggsplug_product_stock(UUID, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION restore_loggsplug_product_stock(UUID, INT) TO service_role;

COMMENT ON FUNCTION reserve_loggsplug_product_stock(UUID, INT) IS
  'Locks product row and decrements Loggsplug stock atomically. Raises Out of stock if insufficient.';

COMMENT ON FUNCTION restore_loggsplug_product_stock(UUID, INT) IS
  'Restores Loggsplug stock after a failed supplier purchase (wallet already refunded separately).';
