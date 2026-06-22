-- Store approximate visitor location (from IP lookup on homepage/marketplace visit).

ALTER TABLE site_sessions
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE site_page_views
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

CREATE OR REPLACE FUNCTION record_site_visit(
  p_session_id TEXT,
  p_path TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_visitor_type TEXT;
  v_path TEXT;
  v_base_path TEXT;
  v_country TEXT;
  v_region TEXT;
  v_city TEXT;
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

  v_country := NULLIF(left(trim(COALESCE(p_country, '')), 120), '');
  v_region := NULLIF(left(trim(COALESCE(p_region, '')), 120), '');
  v_city := NULLIF(left(trim(COALESCE(p_city, '')), 120), '');

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
    country,
    region,
    city,
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
    v_country,
    v_region,
    v_city,
    NOW(),
    NOW(),
    1
  )
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    visitor_type = EXCLUDED.visitor_type,
    last_path = EXCLUDED.last_path,
    user_agent = COALESCE(EXCLUDED.user_agent, site_sessions.user_agent),
    country = COALESCE(EXCLUDED.country, site_sessions.country),
    region = COALESCE(EXCLUDED.region, site_sessions.region),
    city = COALESCE(EXCLUDED.city, site_sessions.city),
    last_seen_at = NOW(),
    page_views = site_sessions.page_views + 1;

  INSERT INTO site_page_views (session_id, user_id, visitor_type, path, country, region, city)
  VALUES (p_session_id, v_user_id, v_visitor_type, v_path, v_country, v_region, v_city);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION record_site_visit(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
