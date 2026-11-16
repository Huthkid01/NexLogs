import { supabase } from '@/lib/supabase';
import { getVisitorSessionId } from '@/lib/visitor-session';
import { getVisitorLocation } from '@/lib/visitor-location';
import {
  isMarketplaceVisitPath,
  MARKETPLACE_PAGE_VIEW_PATH_FILTER,
  MARKETPLACE_SESSION_PATH_FILTER,
} from '@/lib/marketplace-visit-path';

export interface SiteSession {
  id: string;
  session_id: string;
  user_id: string | null;
  visitor_type: 'guest' | 'registered';
  last_path: string;
  user_agent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  ip: string | null;
  latitude: number | null;
  longitude: number | null;
  postal_code: string | null;
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
  country: string | null;
  region: string | null;
  city: string | null;
  ip: string | null;
  latitude: number | null;
  longitude: number | null;
  postal_code: string | null;
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

export interface ActiveUserPeriodStats {
  weeklyRegistered: number;
  monthlyRegistered: number;
  weeklyGuests: number;
  monthlyGuests: number;
  weeklyVisits: number;
  monthlyVisits: number;
}

export interface ActiveRegisteredUser {
  user_id: string;
  full_name: string;
  email: string;
  last_seen_at: string;
  page_views: number;
  country: string | null;
  region: string | null;
  city: string | null;
  ip: string | null;
  latitude: number | null;
  longitude: number | null;
  postal_code: string | null;
  last_path: string;
}

export const SITE_ACTIVE_WINDOW_MINUTES = 5;

const ACTIVE_WINDOW_MINUTES = SITE_ACTIVE_WINDOW_MINUTES;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function excludeAdminSessions(query: any, adminIds: string[]) {
  let filtered = query.or(MARKETPLACE_SESSION_PATH_FILTER);
  if (adminIds.length > 0) {
    filtered = filtered.not('user_id', 'in', `(${adminIds.join(',')})`);
  }
  return filtered;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function excludeAdminPageViews(query: any, adminIds: string[]) {
  let filtered = query.or(MARKETPLACE_PAGE_VIEW_PATH_FILTER);
  if (adminIds.length > 0) {
    filtered = filtered.not('user_id', 'in', `(${adminIds.join(',')})`);
  }
  return filtered;
}

function isTrackableSession(session: SiteSession) {
  if (!isMarketplaceVisitPath(session.last_path)) return false;
  if (session.profile?.role === 'admin') return false;
  return true;
}

function isTrackablePageView(visit: SitePageView) {
  if (!isMarketplaceVisitPath(visit.path)) return false;
  if (visit.profile?.role === 'admin') return false;
  return true;
}

export const siteVisitService = {
  async record(path: string): Promise<void> {
    const sessionId = getVisitorSessionId();
    const location = await getVisitorLocation();
    const basePayload = {
      p_session_id: sessionId,
      p_path: path,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_country: location.country,
      p_region: location.region,
      p_city: location.city,
    };

    let { error } = await supabase.rpc('record_site_visit', {
      ...basePayload,
      p_ip: location.ip,
      p_latitude: location.latitude,
      p_longitude: location.longitude,
      p_postal_code: location.postal_code,
    } as never);

    // Older DB without migration 103 still accepts city/region/country only.
    if (error?.message?.toLowerCase().includes('could not find the function')) {
      ({ error } = await supabase.rpc('record_site_visit', basePayload as never));
    }

    if (error) {
      console.warn('Failed to record site visit', error.message);
    }
  },

  async clearAll(): Promise<void> {
    const { data, error } = await supabase.rpc('clear_site_visits', {});

    if (error) throw new Error(error.message);

    const result = data as { cleared?: boolean } | null;
    if (!result?.cleared) {
      throw new Error('Failed to clear visits');
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

  async getActivePeriodStats(): Promise<ActiveUserPeriodStats> {
    const adminIds = await getAdminUserIds();
    const weeklySince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthlySince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      weeklyRegisteredRes,
      monthlyRegisteredRes,
      weeklyGuestsRes,
      monthlyGuestsRes,
      weeklyVisitsRes,
      monthlyVisitsRes,
    ] = await Promise.all([
      excludeAdminSessions(
        supabase
          .from('site_sessions')
          .select('user_id')
          .eq('visitor_type', 'registered')
          .not('user_id', 'is', null)
          .gte('last_seen_at', weeklySince),
        adminIds,
      ),
      excludeAdminSessions(
        supabase
          .from('site_sessions')
          .select('user_id')
          .eq('visitor_type', 'registered')
          .not('user_id', 'is', null)
          .gte('last_seen_at', monthlySince),
        adminIds,
      ),
      excludeAdminSessions(
        supabase
          .from('site_sessions')
          .select('session_id')
          .eq('visitor_type', 'guest')
          .gte('last_seen_at', weeklySince),
        adminIds,
      ),
      excludeAdminSessions(
        supabase
          .from('site_sessions')
          .select('session_id')
          .eq('visitor_type', 'guest')
          .gte('last_seen_at', monthlySince),
        adminIds,
      ),
      excludeAdminPageViews(
        supabase
          .from('site_page_views')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weeklySince),
        adminIds,
      ),
      excludeAdminPageViews(
        supabase
          .from('site_page_views')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthlySince),
        adminIds,
      ),
    ]);

    const uniqueRegistered = (rows: Array<{ user_id: string | null }> | null) =>
      new Set((rows ?? []).map((row) => row.user_id).filter(Boolean)).size;
    const uniqueGuests = (rows: Array<{ session_id: string }> | null) =>
      new Set((rows ?? []).map((row) => row.session_id).filter(Boolean)).size;

    return {
      weeklyRegistered: uniqueRegistered(weeklyRegisteredRes.data as Array<{ user_id: string | null }> | null),
      monthlyRegistered: uniqueRegistered(monthlyRegisteredRes.data as Array<{ user_id: string | null }> | null),
      weeklyGuests: uniqueGuests(weeklyGuestsRes.data as Array<{ session_id: string }> | null),
      monthlyGuests: uniqueGuests(monthlyGuestsRes.data as Array<{ session_id: string }> | null),
      weeklyVisits: weeklyVisitsRes.count ?? 0,
      monthlyVisits: monthlyVisitsRes.count ?? 0,
    };
  },

  async getActiveRegisteredUsers(period: 'weekly' | 'monthly'): Promise<ActiveRegisteredUser[]> {
    const adminIds = await getAdminUserIds();
    const since = new Date(
      Date.now() - (period === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await excludeAdminSessions(
      supabase
        .from('site_sessions')
        .select('user_id, last_seen_at, page_views, country, region, city, ip, latitude, longitude, postal_code, last_path, profile:profiles(full_name, email, role)')
        .eq('visitor_type', 'registered')
        .not('user_id', 'is', null)
        .gte('last_seen_at', since)
        .order('last_seen_at', { ascending: false })
        .limit(500),
      adminIds,
    );

    if (error) throw error;

    type ActiveSessionRow = {
      user_id: string | null;
      last_seen_at: string;
      page_views: number;
      country: string | null;
      region: string | null;
      city: string | null;
      ip: string | null;
      latitude: number | null;
      longitude: number | null;
      postal_code: string | null;
      last_path: string;
      profile?: { full_name: string; email: string; role?: string } | null;
    };

    const byUser = new Map<string, ActiveRegisteredUser>();
    for (const row of (data || []) as unknown as ActiveSessionRow[]) {
      if (!row.user_id || row.profile?.role === 'admin') continue;
      const existing = byUser.get(row.user_id);
      if (existing && existing.last_seen_at >= row.last_seen_at) {
        existing.page_views += row.page_views;
        continue;
      }
      byUser.set(row.user_id, {
        user_id: row.user_id,
        full_name: row.profile?.full_name || 'Registered user',
        email: row.profile?.email || '',
        last_seen_at: row.last_seen_at,
        page_views: (existing?.page_views ?? 0) + row.page_views,
        country: row.country,
        region: row.region,
        city: row.city,
        ip: row.ip,
        latitude: row.latitude,
        longitude: row.longitude,
        postal_code: row.postal_code,
        last_path: row.last_path,
      });
    }

    return [...byUser.values()].sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
  },
};
