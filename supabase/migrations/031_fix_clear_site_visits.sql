-- Allow admins to delete visit records and make clear_site_visits reliable.

DROP POLICY IF EXISTS "Admins can delete site sessions" ON site_sessions;
DROP POLICY IF EXISTS "Admins can delete site page views" ON site_page_views;

CREATE POLICY "Admins can delete site sessions"
  ON site_sessions FOR DELETE USING (is_admin());

CREATE POLICY "Admins can delete site page views"
  ON site_page_views FOR DELETE USING (is_admin());

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
