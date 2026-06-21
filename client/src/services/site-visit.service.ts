import { supabase } from '@/lib/supabase';
import { getVisitorSessionId } from '@/lib/visitor-session';

export interface SiteSession {
  id: string;
  session_id: string;
  user_id: string | null;
  visitor_type: 'guest' | 'registered';
  last_path: string;
  user_agent: string | null;
  first_seen_at: string;
  last_seen_at: string;
  page_views: number;
  profile?: {
    full_name: string;
    email: string;
    role?: string;
  } | null;
}

export interface SitePageView {
  id: string;
  session_id: string;
  user_id: string | null;
  visitor_type: 'guest' | 'registered';
  path: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    role?: string;
  } | null;
}

export interface SiteVisitorStats {
  registeredUsers: number;
  activeVisitors: number;
  activeRegistered: number;
  activeGuests: number;
  visitsToday: number;
}

const ACTIVE_WINDOW_MINUTES = 15;

function getActiveSinceIso() {
  return new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();
}

function getTodayStartIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

async function getAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabase.from('profiles').select('id').eq('role', 'admin');
  if (error) {
    console.warn('Failed to load admin ids for visitor filtering', error.message);
    return [];
  }
  return (data ?? []).map((profile) => profile.id);
}

function excludeAdminSessions<T extends { eq: (col: string, val: string) => T; not: (col: string, op: string, val: string) => T }>(
  query: T,
  adminIds: string[],
) {
  let filtered = query.not('last_path', 'like', '/admin%');
  if (adminIds.length > 0) {
    filtered = filtered.not('user_id', 'in', `(${adminIds.join(',')})`);
  }
  return filtered;
}

function excludeAdminPageViews<T extends { not: (col: string, op: string, val: string) => T }>(
  query: T,
  adminIds: string[],
) {
  let filtered = query.not('path', 'like', '/admin%');
  if (adminIds.length > 0) {
    filtered = filtered.not('user_id', 'in', `(${adminIds.join(',')})`);
  }
  return filtered;
}

function isTrackableSession(session: SiteSession) {
  if (session.last_path.startsWith('/admin')) return false;
  if (session.profile?.role === 'admin') return false;
  return true;
}

function isTrackablePageView(visit: SitePageView) {
  if (visit.path.startsWith('/admin')) return false;
  if (visit.profile?.role === 'admin') return false;
  return true;
}

export const siteVisitService = {
  async record(path: string): Promise<void> {
    const sessionId = getVisitorSessionId();
    const { error } = await supabase.rpc('record_site_visit', {
      p_session_id: sessionId,
      p_path: path,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    } as never);

    if (error) {
      console.warn('Failed to record site visit', error.message);
    }
  },

  async getStats(): Promise<SiteVisitorStats> {
    const activeSince = getActiveSinceIso();
    const todayStart = getTodayStartIso();
    const adminIds = await getAdminUserIds();

    const [usersRes, activeRes, activeRegisteredRes, activeGuestsRes, visitsTodayRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      excludeAdminSessions(
        supabase
          .from('site_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', activeSince),
        adminIds,
      ),
      excludeAdminSessions(
        supabase
          .from('site_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', activeSince)
          .eq('visitor_type', 'registered'),
        adminIds,
      ),
      excludeAdminSessions(
        supabase
          .from('site_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', activeSince)
          .eq('visitor_type', 'guest'),
        adminIds,
      ),
      excludeAdminPageViews(
        supabase
          .from('site_page_views')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart),
        adminIds,
      ),
    ]);

    return {
      registeredUsers: usersRes.count ?? 0,
      activeVisitors: activeRes.count ?? 0,
      activeRegistered: activeRegisteredRes.count ?? 0,
      activeGuests: activeGuestsRes.count ?? 0,
      visitsToday: visitsTodayRes.count ?? 0,
    };
  },

  async getActiveSessions(): Promise<SiteSession[]> {
    const adminIds = await getAdminUserIds();
    const { data, error } = await excludeAdminSessions(
      supabase
        .from('site_sessions')
        .select('*, profile:profiles(full_name, email, role)')
        .gte('last_seen_at', getActiveSinceIso())
        .order('last_seen_at', { ascending: false })
        .limit(100),
      adminIds,
    );

    if (error) throw error;
    return ((data || []) as SiteSession[]).filter(isTrackableSession);
  },

  async getRecentPageViews(limit = 100): Promise<SitePageView[]> {
    const adminIds = await getAdminUserIds();
    const { data, error } = await excludeAdminPageViews(
      supabase
        .from('site_page_views')
        .select('*, profile:profiles(full_name, email, role)')
        .order('created_at', { ascending: false })
        .limit(limit),
      adminIds,
    );

    if (error) throw error;
    return ((data || []) as SitePageView[]).filter(isTrackablePageView);
  },
};
