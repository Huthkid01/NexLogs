-- Enable Supabase Realtime for admin dashboard tables.

ALTER TABLE IF EXISTS public.profiles REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.site_sessions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.site_page_views REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.activity_logs REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.coupons REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'site_sessions',
    'site_page_views',
    'support_tickets',
    'activity_logs',
    'coupons'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;
