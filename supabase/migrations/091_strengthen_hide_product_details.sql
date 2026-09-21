-- Strengthen 090: ensure product_details remains unreadable via public REST.
-- Live DB already updated; this keeps migration history consistent.

REVOKE SELECT ON TABLE public.products FROM PUBLIC;
REVOKE SELECT ON TABLE public.products FROM anon;
REVOKE SELECT ON TABLE public.products FROM authenticated;

GRANT SELECT (
  id,
  title,
  slug,
  description,
  platform,
  price,
  stock,
  followers,
  following,
  account_age,
  country,
  niche,
  verified,
  featured,
  category_id,
  is_active,
  created_at,
  updated_at,
  sort_order,
  preview_url,
  login_instructions,
  supplier,
  supplier_product_id,
  supplier_cost_ngn,
  markup_percent_override
) ON TABLE public.products TO anon, authenticated;

GRANT SELECT ON TABLE public.products TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_products() TO authenticated;
NOTIFY pgrst, 'reload schema';
