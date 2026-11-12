/**
 * Shared TanStack Query cache policy for Nexlogs.
 * Catalog/public data can stay warm longer; wallet/user data stays short-lived.
 */

export const CACHE_TIMES = {
  /** Default for most screens */
  defaultStaleMs: 60_000,
  /** Keep unused cached data in memory */
  gcMs: 10 * 60_000,
  /** Categories / featured / public catalog — many users share the same reads */
  catalogStaleMs: 5 * 60_000,
  catalogGcMs: 30 * 60_000,
  /** SMS provider catalogs change rarely during a session */
  smsCatalogStaleMs: 3 * 60_000,
  /** FOMO / marketing widgets */
  socialStaleMs: 5 * 60_000,
  /** Site copy / slides — safe to reuse across navigations */
  siteContentStaleMs: 5 * 60_000,
  /** Wallet / purchases / auth-sensitive */
  privateStaleMs: 5_000,
} as const;

export const catalogQueryOptions = {
  staleTime: CACHE_TIMES.catalogStaleMs,
  gcTime: CACHE_TIMES.catalogGcMs,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export const privateQueryOptions = {
  staleTime: CACHE_TIMES.privateStaleMs,
  gcTime: CACHE_TIMES.gcMs,
  refetchOnWindowFocus: true,
  retry: 1,
} as const;
