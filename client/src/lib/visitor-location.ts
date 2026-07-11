export interface VisitorLocation {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

const CACHE_KEY = 'nexlogs_visitor_location';

const EMPTY_LOCATION: VisitorLocation = {
  ip: null,
  country: null,
  region: null,
  city: null,
};

/** Approximate location from visitor IP (no browser permission needed). */
export async function getVisitorLocation(): Promise<VisitorLocation> {
  if (typeof window === 'undefined') return EMPTY_LOCATION;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached) as VisitorLocation;

    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return EMPTY_LOCATION;

    const data = (await response.json()) as {
      ip?: string;
      country_name?: string;
      country?: string;
      region?: string;
      city?: string;
    };

    const location: VisitorLocation = {
      ip: data.ip || null,
      country: data.country_name || data.country || null,
      region: data.region || null,
      city: data.city || null,
    };

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
    return location;
  } catch {
    return EMPTY_LOCATION;
  }
}

export function formatVisitorLocation(
  location: Partial<VisitorLocation> | null | undefined,
): string {
  if (!location) return 'Location unknown';
  const parts = [location.city, location.region, location.country].filter(Boolean);
  const locationText = parts.length > 0 ? parts.join(', ') : null;
  if (location.ip && locationText) return `${locationText} (${location.ip})`;
  if (location.ip) return location.ip;
  return locationText ?? 'Location unknown';
}

export function getVisitorDisplayName(
  visitorType: 'guest' | 'registered',
  profile?: { full_name?: string | null; email?: string | null } | null,
): string {
  if (visitorType === 'guest') return 'Guest (opened site link)';
  return profile?.full_name || profile?.email || 'Registered visitor';
}
