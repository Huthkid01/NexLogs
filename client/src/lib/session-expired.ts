import { peekAuthRedirect, storeAuthRedirect } from '@/lib/auth-redirect';

const SESSION_EXPIRED_KEY = 'nexlogs_session_expired';
const SESSION_EXPIRED_LOGIN_KEY = 'nexlogs_session_expired_login';
const SESSION_EXPIRED_ADMIN_KEY = 'nexlogs_session_expired_admin';
export const SESSION_EXPIRED_PATH = '/session-expired';

export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again.';

export function resolveLoginPath(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
  options?: { admin?: boolean },
) {
  if (options?.admin) return '/admin/login';
  return pathname.startsWith('/admin') ? '/admin/login' : '/login';
}

function pathOnly(path: string) {
  return path.split('?')[0] || '/';
}

function isAdminPath(path: string) {
  return pathOnly(path).startsWith('/admin');
}

export function markSessionExpired(
  returnPath?: string,
  options?: { admin?: boolean },
) {
  const pathname =
    returnPath != null
      ? pathOnly(returnPath)
      : typeof window !== 'undefined'
        ? window.location.pathname
        : '/';

  const isAdminSession = options?.admin === true || isAdminPath(pathname);
  const loginPath = isAdminSession ? '/admin/login' : '/login';

  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
    sessionStorage.setItem(SESSION_EXPIRED_LOGIN_KEY, loginPath);
    sessionStorage.setItem(SESSION_EXPIRED_ADMIN_KEY, isAdminSession ? '1' : '0');
  } catch {
    // ignore storage failures
  }

  if (
    returnPath
    && returnPath !== '/login'
    && returnPath !== '/admin/login'
    && pathOnly(returnPath) !== SESSION_EXPIRED_PATH
  ) {
    storeAuthRedirect(isAdminSession && !isAdminPath(returnPath) ? '/admin' : returnPath);
  } else if (isAdminSession) {
    storeAuthRedirect('/admin');
  }
}

/** Prefer the stored admin/user login target. Never guess /login while on /session-expired. */
export function peekSessionExpiredLoginPath() {
  try {
    const stored = sessionStorage.getItem(SESSION_EXPIRED_LOGIN_KEY);
    if (stored === '/admin/login' || stored === '/login') return stored;

    if (sessionStorage.getItem(SESSION_EXPIRED_ADMIN_KEY) === '1') {
      return '/admin/login';
    }

    const redirect = peekAuthRedirect();
    if (redirect && isAdminPath(redirect)) {
      return '/admin/login';
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined' && isAdminPath(window.location.pathname)) {
    return '/admin/login';
  }

  return '/login';
}

export function consumeSessionExpiredNotice(): boolean {
  try {
    const value = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_LOGIN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_ADMIN_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export function getCurrentReturnPath() {
  if (typeof window === 'undefined') return '/marketplace';
  const path = `${window.location.pathname}${window.location.search}`;
  const bare = pathOnly(path);

  if (!bare || bare === SESSION_EXPIRED_PATH || bare === '/login') {
    return '/marketplace';
  }

  if (bare === '/admin/login') {
    return '/admin';
  }

  return path;
}
