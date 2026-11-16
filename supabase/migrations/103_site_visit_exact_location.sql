-- Persist visitor IP + coordinates so admin tracking can show exact location details.

ALTER TABLE site_sessions
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

ALTER TABLE site_page_views
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

DROP FUNCTION IF EXISTS record_site_visit(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS record_site_visit(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION record_site_visit(
  p_session_id TEXT,
  p_path TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL
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
  v_ip TEXT;
  v_latitude DOUBLE PRECISION;
  v_longitude DOUBLE PRECISION;
  v_postal_code TEXT;
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
  v_ip := NULLIF(left(trim(COALESCE(p_ip, '')), 64), '');
  v_postal_code := NULLIF(left(trim(COALESCE(p_postal_code, '')), 32), '');
  v_latitude := CASE
    WHEN p_latitude IS NULL THEN NULL
    WHEN p_latitude < -90 OR p_latitude > 90 THEN NULL
    ELSE p_latitude
  END;
  v_longitude := CASE
    WHEN p_longitude IS NULL THEN NULL
    WHEN p_longitude < -180 OR p_longitude > 180 THEN NULL
    ELSE p_longitude
  END;

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
    ip,
    latitude,
    longitude,
    postal_code,
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
    v_ip,
    v_latitude,
    v_longitude,
    v_postal_code,
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
    ip = COALESCE(EXCLUDED.ip, site_sessions.ip),
    latitude = COALESCE(EXCLUDED.latitude, site_sessions.latitude),
    longitude = COALESCE(EXCLUDED.longitude, site_sessions.longitude),
    postal_code = COALESCE(EXCLUDED.postal_code, site_sessions.postal_code),
    last_seen_at = NOW(),
    page_views = site_sessions.page_views + 1;

  INSERT INTO site_page_views (
    session_id,
    user_id,
    visitor_type,
    path,
    country,
    region,
    city,
    ip,
    latitude,
    longitude,
    postal_code
  )
  VALUES (
    p_session_id,
    v_user_id,
    v_visitor_type,
    v_path,
    v_country,
    v_region,
    v_city,
    v_ip,
    v_latitude,
    v_longitude,
    v_postal_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION record_site_visit(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT)
  TO anon, authenticated;
