import { storeAuthRedirect } from '@/lib/auth-redirect';

const SESSION_EXPIRED_KEY = 'nexlogs_session_expired';
const SESSION_EXPIRED_LOGIN_KEY = 'nexlogs_session_expired_login';
export const SESSION_EXPIRED_PATH = '/session-expired';

export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again.';

export function resolveLoginPath(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  return pathname.startsWith('/admin') ? '/admin/login' : '/login';
}

function pathOnly(path: string) {
  return path.split('?')[0] || '/';
}

export function markSessionExpired(returnPath?: string) {
  const pathname =
    returnPath != null
      ? pathOnly(returnPath)
      : typeof window !== 'undefined'
        ? window.location.pathname
        : '/';
  const loginPath = resolveLoginPath(pathname);

  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
    sessionStorage.setItem(SESSION_EXPIRED_LOGIN_KEY, loginPath);
  } catch {
    // ignore storage failures
  }

  if (
    returnPath
    && returnPath !== '/login'
    && returnPath !== '/admin/login'
    && pathOnly(returnPath) !== SESSION_EXPIRED_PATH
  ) {
    storeAuthRedirect(returnPath);
  }
}

export function peekSessionExpiredLoginPath() {
  try {
    const stored = sessionStorage.getItem(SESSION_EXPIRED_LOGIN_KEY);
    if (stored === '/admin/login' || stored === '/login') return stored;
  } catch {
    // ignore
  }
  return resolveLoginPath();
}

export function consumeSessionExpiredNotice(): boolean {
  try {
    const value = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_LOGIN_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export function getCurrentReturnPath() {
  if (typeof window === 'undefined') return '/marketplace';
  const path = `${window.location.pathname}${window.location.search}`;
  if (
    !path
    || path === '/login'
    || path === '/admin/login'
    || pathOnly(path) === SESSION_EXPIRED_PATH
  ) {
    return '/marketplace';
  }
  return path;
}
