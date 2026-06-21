-- Only track homepage/marketplace visits; allow admins to clear visit history.

CREATE OR REPLACE FUNCTION record_site_visit(
  p_session_id TEXT,
  p_path TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_visitor_type TEXT;
  v_path TEXT;
  v_base_path TEXT;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 THEN
    RAISE EXCEPTION 'Invalid session id' USING ERRCODE = '22023';
  END IF;

  v_path := COALESCE(NULLIF(trim(p_path), ''), '/');
  IF length(v_path) > 500 THEN
    v_path := left(v_path, 500);
  END IF;

  v_base_path := split_part(v_path, '?', 1);
  IF v_base_path NOT IN ('/', '/marketplace') THEN
    RETURN;
  END IF;

  v_user_id := auth.uid();
  v_visitor_type := CASE WHEN v_user_id IS NULL THEN 'guest' ELSE 'registered' END;

  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO site_sessions (
    session_id,
    user_id,
    visitor_type,
    last_path,
    user_agent,
    first_seen_at,
    last_seen_at,
    page_views
  )
  VALUES (
    p_session_id,
    v_user_id,
    v_visitor_type,
    v_path,
    NULLIF(left(COALESCE(p_user_agent, ''), 500), ''),
    NOW(),
    NOW(),
    1
  )
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    visitor_type = EXCLUDED.visitor_type,
    last_path = EXCLUDED.last_path,
    user_agent = COALESCE(EXCLUDED.user_agent, site_sessions.user_agent),
    last_seen_at = NOW(),
    page_views = site_sessions.page_views + 1;

  INSERT INTO site_page_views (session_id, user_id, visitor_type, path)
  VALUES (p_session_id, v_user_id, v_visitor_type, v_path);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION clear_site_visits()
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  DELETE FROM site_page_views;
  DELETE FROM site_sessions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION clear_site_visits() TO authenticated;
