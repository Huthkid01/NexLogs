const AUTH_REDIRECT_KEY = 'nexlogs_post_login_redirect';

export function getPostLoginPath(
  from: { pathname?: string; search?: string } | null | undefined,
  fallback = '/marketplace',
) {
  if (
    !from?.pathname
    || from.pathname === '/login'
    || from.pathname === '/register'
    || from.pathname === '/admin/login'
  ) {
    return fallback;
  }
  return `${from.pathname}${from.search ?? ''}`;
}

export function storeAuthRedirect(path: string) {
  if (!path || path === '/login' || path === '/admin/login') return;
  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
  } catch {
    // ignore
  }
}

export function peekAuthRedirect() {
  try {
    return sessionStorage.getItem(AUTH_REDIRECT_KEY);
  } catch {
    return null;
  }
}

export function consumeAuthRedirect(fallback = '/marketplace') {
  try {
    const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    if (!stored || stored === '/login' || stored === '/admin/login') return fallback;
    return stored;
  } catch {
    return fallback;
  }
}
