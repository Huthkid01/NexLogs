-- PostgREST returns 400 for VOID RPCs when the client expects JSON.
-- Recreate clear_site_visits to return json instead.

DROP FUNCTION IF EXISTS clear_site_visits();

CREATE OR REPLACE FUNCTION clear_site_visits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  TRUNCATE TABLE public.site_page_views;
  TRUNCATE TABLE public.site_sessions;

  RETURN json_build_object('cleared', true);
END;
$$;

GRANT EXECUTE ON FUNCTION clear_site_visits() TO authenticated;
GRANT DELETE ON TABLE public.site_page_views TO authenticated;
GRANT DELETE ON TABLE public.site_sessions TO authenticated;
