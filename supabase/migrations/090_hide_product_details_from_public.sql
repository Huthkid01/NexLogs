-- Hide unsold inventory (product_details) from public/authenticated REST reads.
-- Safe: purchase RPCs and admin_list_products are SECURITY DEFINER and still read inventory.
-- Does not change tables, data, prices, wallets, or order history.

REVOKE SELECT (product_details) ON TABLE public.products FROM PUBLIC;
REVOKE SELECT (product_details) ON TABLE public.products FROM anon;
REVOKE SELECT (product_details) ON TABLE public.products FROM authenticated;

-- Ensure admin listing still works (already SECURITY DEFINER; reaffirm execute grant).
GRANT EXECUTE ON FUNCTION public.admin_list_products() TO authenticated;

COMMENT ON COLUMN public.products.product_details IS
  'Unsold inventory. Hidden from anon/authenticated API reads; readable via admin_list_products and purchase SECURITY DEFINER RPCs.';
