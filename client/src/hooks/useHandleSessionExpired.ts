import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCurrentReturnPath,
  markSessionExpired,
  resolveLoginPath,
} from '@/lib/session-expired';

/**
 * Signs the user out and sends them to login with a clear "session expired" notice.
 * Use this instead of showing auth/error pages when the session is no longer valid.
 */
export function useHandleSessionExpired() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(async () => {
    const returnPath = `${location.pathname}${location.search}` || getCurrentReturnPath();
    markSessionExpired(returnPath);

    try {
      await signOut();
    } catch {
      // Still send them to login even if sign-out fails.
    }

    navigate(resolveLoginPath(location.pathname), {
      replace: true,
      state: {
        from: { pathname: location.pathname, search: location.search },
      },
    });
  }, [signOut, navigate, location.pathname, location.search]);
}
