const AUTH_REDIRECT_KEY = 'nexlogs_post_login_redirect';

export function getPostLoginPath(
  from: { pathname?: string; search?: string } | null | undefined,
  fallback = '/marketplace',
) {
  if (!from?.pathname || from.pathname === '/login' || from.pathname === '/register') {
    return fallback;
  }
  return `${from.pathname}${from.search ?? ''}`;
}

export function storeAuthRedirect(path: string) {
  if (!path || path === '/login') return;
  sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
}

export function consumeAuthRedirect(fallback = '/marketplace') {
  const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  return stored && stored !== '/login' ? stored : fallback;
}
