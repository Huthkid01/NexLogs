-- Grant service_role full permissions on products table for edge functions
-- This fixes permission denied errors when syncing Loggsplug products

GRANT INSERT, UPDATE, DELETE ON TABLE public.products TO service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.product_images TO service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.categories TO service_role;

NOTIFY pgrst, 'reload schema';
