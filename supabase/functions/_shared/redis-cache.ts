/**
 * Upstash Redis REST cache for Edge Functions.
 * If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are missing, all ops no-op
 * so the site keeps working without Redis.
 */

const DEFAULT_TTL_SECONDS = 300;

function getRedisConfig() {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL')?.trim();
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

export function isRedisConfigured() {
  return getRedisConfig() != null;
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      console.warn(`[redis] command failed HTTP ${response.status}`);
      return null;
    }

    const payload = await response.json() as { result?: unknown };
    return payload.result ?? null;
  } catch (error) {
    console.warn('[redis] request error:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await redisCommand(['GET', key]);
  if (typeof raw !== 'string' || !raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  const payload = JSON.stringify(value);
  const result = await redisCommand(['SET', key, payload, 'EX', Math.max(1, Math.floor(ttlSeconds))]);
  return result === 'OK';
}

export async function cacheDel(key: string): Promise<void> {
  await redisCommand(['DEL', key]);
}

/** Best-effort delete for fingerprint keys (product pages, etc.). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const keys = await redisCommand(['KEYS', pattern]);
  if (!Array.isArray(keys) || keys.length === 0) return;

  const list = keys.filter((key): key is string => typeof key === 'string' && key.length > 0);
  if (!list.length) return;

  // Upstash REST accepts DEL with multiple keys.
  await redisCommand(['DEL', ...list]);
}

/** Drop cached marketplace listings after stock changes (purchase / admin edit). */
export async function invalidatePublicListingCaches(): Promise<void> {
  await Promise.all([
    cacheDel(REDIS_KEYS.featured(6)),
    cacheDel(REDIS_KEYS.featured(12)),
    cacheDel(REDIS_KEYS.loggsplugProducts),
    cacheDelPattern('public:products:v1:*'),
  ]);
}

/** Read-through cache helper for shared expensive reads. */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGetJson<T>(key);
  if (cached != null) return cached;

  const fresh = await loader();
  // Best-effort write; never block the response on Redis failures.
  void cacheSetJson(key, fresh, ttlSeconds);
  return fresh;
}

/** Alias used by some call sites. */
export const cachedJson = withCache;

export const REDIS_TTL = {
  smsCatalog: 5 * 60,
  smsPools: 2 * 60,
  loggsplugProducts: 10 * 60,
  categories: 10 * 60,
  // Short so sold-out items drop from listings quickly after stock hits 0.
  featured: 75,
  productsPage: 75,
  siteContent: 15 * 60,
} as const;

export const REDIS_KEYS = {
  categories: 'public:categories:active:v1',
  featured: (limit: number) => `public:featured:v1:${limit}`,
  productsPage: (fingerprint: string) => `public:products:v1:${fingerprint}`,
  siteContent: 'public:site-content:v1',
  loggsplugProducts: 'loggsplug:products:list',
  smsCatalog: (provider: string) => `${provider}:catalog:v1`,
} as const;
