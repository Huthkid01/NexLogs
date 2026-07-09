-- Security hardening: revoke wallet minting/refund RPCs from browser clients,
-- restrict profile visibility, hide unsold product inventory, and block fake deposits.

-- 1) Wallet RPCs must only run from trusted edge functions (service_role).
REVOKE EXECUTE ON FUNCTION wallet_deposit(NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION wallet_deposit(NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION wallet_debit_for_sms(NUMERIC, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION wallet_refund_sms(NUMERIC, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION wallet_debit_for_sms(NUMERIC, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION wallet_refund_sms(NUMERIC, TEXT, JSONB) TO service_role;

-- Direct catalog provisioning should stay internal to purchase RPCs.
REVOKE EXECUTE ON FUNCTION ensure_rdp_product_from_catalog(TEXT) FROM authenticated;

-- 2) Users must not insert wallet deposit rows directly (only SECURITY DEFINER RPCs).
DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON wallet_transactions;

-- 3) Profiles: stop exposing every account email/role to the public internet.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Approved reviewers are publicly viewable"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM reviews r
      WHERE r.user_id = profiles.id
        AND r.is_approved = TRUE
    )
  );

-- 4) Hide unsold account inventory from catalog API reads.
REVOKE SELECT (product_details) ON products FROM anon, authenticated;

CREATE OR REPLACE FUNCTION admin_list_products()
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM products
  ORDER BY sort_order ASC, id ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_products() TO authenticated;

COMMENT ON FUNCTION admin_list_products()
  IS 'Admin-only product listing including product_details inventory.';
