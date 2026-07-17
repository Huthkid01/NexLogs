import { useAuth } from '@/contexts/AuthContext';
import { useIdleSessionTimeout } from '@/hooks/useIdleSessionTimeout';
import { clearSessionActivity } from '@/lib/session-idle';
import {
  getCurrentReturnPath,
  markSessionExpired,
  SESSION_EXPIRED_PATH,
} from '@/lib/session-expired';

export function SessionIdleGuard() {
  const { user, signOut } = useAuth();

  useIdleSessionTimeout({
    enabled: Boolean(user),
    onIdle: async () => {
      markSessionExpired(getCurrentReturnPath());
      clearSessionActivity();

      try {
        await signOut();
      } catch {
        // Continue to session-expired page even if sign-out fails.
      }

      window.location.assign(SESSION_EXPIRED_PATH);
    },
  });

  return null;
}
