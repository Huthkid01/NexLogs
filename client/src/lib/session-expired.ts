import { storeAuthRedirect } from '@/lib/auth-redirect';

const SESSION_EXPIRED_KEY = 'nexlogs_session_expired';

export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again.';

export function resolveLoginPath(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  return pathname.startsWith('/admin') ? '/admin/login' : '/login';
}

export function markSessionExpired(returnPath?: string) {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
  } catch {
    // ignore storage failures
  }

  if (returnPath && returnPath !== '/login' && returnPath !== '/admin/login') {
    storeAuthRedirect(returnPath);
  }
}

export function consumeSessionExpiredNotice(): boolean {
  try {
    const value = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export function getCurrentReturnPath() {
  if (typeof window === 'undefined') return '/marketplace';
  const path = `${window.location.pathname}${window.location.search}`;
  if (!path || path === '/login' || path === '/admin/login') return '/marketplace';
  return path;
}
