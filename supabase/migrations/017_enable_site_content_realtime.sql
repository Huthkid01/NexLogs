ALTER TABLE IF EXISTS public.site_content_blocks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'site_content_blocks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content_blocks;
  END IF;
END
$$;
