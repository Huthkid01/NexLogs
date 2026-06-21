export function getMarketplaceVisitBasePath(pathname: string): '/' | '/marketplace' | null {
  if (pathname === '/' || pathname === '/marketplace') {
    return pathname;
  }
  return null;
}

export function isMarketplaceVisitPath(path: string): boolean {
  const base = path.split('?')[0];
  return base === '/' || base === '/marketplace';
}

/** PostgREST filter: homepage or marketplace paths only (includes query strings). */
export const MARKETPLACE_SESSION_PATH_FILTER =
  'last_path.eq./,last_path.like./?%,last_path.like./marketplace%';

export const MARKETPLACE_PAGE_VIEW_PATH_FILTER =
  'path.eq./,path.like./?%,path.like./marketplace%';
