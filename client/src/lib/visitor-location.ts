export interface VisitorLocation {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

const CACHE_KEY = 'nexlogs_visitor_location_v2';

const EMPTY_LOCATION: VisitorLocation = {
  ip: null,
  country: null,
  region: null,
  city: null,
  postal_code: null,
  latitude: null,
  longitude: null,
};

function hasUsableLocation(location: VisitorLocation) {
  return Boolean(location.ip || location.city || location.region || location.country);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function lookupIpWho(): Promise<VisitorLocation | null> {
  const response = await fetch('https://ipwho.is/', {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    success?: boolean;
    ip?: string;
    country?: string;
    region?: string;
    city?: string;
    postal?: string;
    latitude?: number | string;
    longitude?: number | string;
  };

  if (data.success === false) return null;

  return {
    ip: data.ip || null,
    country: data.country || null,
    region: data.region || null,
    city: data.city || null,
    postal_code: data.postal || null,
    latitude: toNumber(data.latitude),
    longitude: toNumber(data.longitude),
  };
}

async function lookupIpApiCo(): Promise<VisitorLocation | null> {
  const response = await fetch('https://ipapi.co/json/', {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    error?: boolean;
    ip?: string;
    country_name?: string;
    country?: string;
    region?: string;
    city?: string;
    postal?: string;
    latitude?: number | string;
    longitude?: number | string;
  };

  if (data.error) return null;

  return {
    ip: data.ip || null,
    country: data.country_name || data.country || null,
    region: data.region || null,
    city: data.city || null,
    postal_code: data.postal || null,
    latitude: toNumber(data.latitude),
    longitude: toNumber(data.longitude),
  };
}

/** Approximate location from visitor IP (no browser permission needed). */
export async function getVisitorLocation(): Promise<VisitorLocation> {
  if (typeof window === 'undefined') return EMPTY_LOCATION;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as VisitorLocation;
      if (hasUsableLocation(parsed)) return parsed;
    }

    const providers = [lookupIpWho, lookupIpApiCo];
    for (const provider of providers) {
      try {
        const location = await provider();
        if (location && hasUsableLocation(location)) {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
          return location;
        }
      } catch {
        // Try next provider.
      }
    }

    return EMPTY_LOCATION;
  } catch {
    return EMPTY_LOCATION;
  }
}

export function formatVisitorLocation(
  location: Partial<VisitorLocation> | null | undefined,
): string {
  if (!location) return 'Location unknown';

  const placeParts = [
    location.city,
    location.region,
    location.postal_code,
    location.country,
  ].filter(Boolean);
  const placeText = placeParts.length > 0 ? placeParts.join(', ') : null;

  const hasCoords =
    typeof location.latitude === 'number'
    && typeof location.longitude === 'number'
    && Number.isFinite(location.latitude)
    && Number.isFinite(location.longitude);
  const coordsText = hasCoords
    ? `${location.latitude!.toFixed(4)}, ${location.longitude!.toFixed(4)}`
    : null;

  const details = [placeText, location.ip ? `IP ${location.ip}` : null, coordsText]
    .filter(Boolean);

  return details.length > 0 ? details.join(' · ') : 'Location unknown';
}

export function getVisitorDisplayName(
  visitorType: 'guest' | 'registered',
  profile?: { full_name?: string | null; email?: string | null } | null,
): string {
  if (visitorType === 'guest') return 'Guest (opened site link)';
  return profile?.full_name || profile?.email || 'Registered visitor';
}
