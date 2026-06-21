-- Track site visitors (guests and registered users) for admin analytics.

CREATE TABLE IF NOT EXISTS site_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visitor_type TEXT NOT NULL CHECK (visitor_type IN ('guest', 'registered')),
  last_path TEXT NOT NULL DEFAULT '/',
  user_agent TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_views INT NOT NULL DEFAULT 1 CHECK (page_views >= 1)
);

CREATE TABLE IF NOT EXISTS site_page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visitor_type TEXT NOT NULL CHECK (visitor_type IN ('guest', 'registered')),
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_sessions_last_seen ON site_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_sessions_user ON site_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_site_page_views_created ON site_page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_page_views_session ON site_page_views(session_id, created_at DESC);

ALTER TABLE site_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read site sessions"
  ON site_sessions FOR SELECT USING (is_admin());

CREATE POLICY "Admins can read site page views"
  ON site_page_views FOR SELECT USING (is_admin());

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
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 THEN
    RAISE EXCEPTION 'Invalid session id' USING ERRCODE = '22023';
  END IF;

  v_path := COALESCE(NULLIF(trim(p_path), ''), '/');
  IF length(v_path) > 500 THEN
    v_path := left(v_path, 500);
  END IF;

  v_user_id := auth.uid();
  v_visitor_type := CASE WHEN v_user_id IS NULL THEN 'guest' ELSE 'registered' END;

  -- Do not track admin panel traffic or admin accounts
  IF v_path LIKE '/admin%' THEN
    RETURN;
  END IF;

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

GRANT EXECUTE ON FUNCTION record_site_visit(TEXT, TEXT, TEXT) TO anon, authenticated;
