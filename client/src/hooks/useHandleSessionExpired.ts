import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCurrentReturnPath,
  markSessionExpired,
  SESSION_EXPIRED_PATH,
} from '@/lib/session-expired';

/**
 * Signs the user out and sends them to the session-expired page
 * (with a login button), instead of a generic crash/error screen.
 */
export function useHandleSessionExpired() {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(async () => {
    const returnPath = `${location.pathname}${location.search}` || getCurrentReturnPath();
    const adminSession =
      isAdmin
      || profile?.role === 'admin'
      || returnPath.startsWith('/admin')
      || location.pathname.startsWith('/admin');

    markSessionExpired(returnPath, { admin: adminSession });

    try {
      await signOut();
    } catch {
      // Still send them to session-expired even if sign-out fails.
    }

    navigate(SESSION_EXPIRED_PATH, { replace: true });
  }, [signOut, navigate, location.pathname, location.search, isAdmin, profile?.role]);
}
