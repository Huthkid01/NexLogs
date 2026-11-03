-- Grant SELECT on product_details to authenticator (PostgREST)
-- This fixes 403 errors when frontend uses select=*
-- RLS policies still control which users can see the data

GRANT SELECT (product_details) ON TABLE public.products TO authenticator;

NOTIFY pgrst, 'reload schema';
