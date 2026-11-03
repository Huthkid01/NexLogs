-- Fix authenticator role permissions for products table
-- The authenticator role is used by PostgREST for all requests

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
) ON TABLE public.products TO authenticator;

NOTIFY pgrst, 'reload schema';
