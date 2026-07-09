import { useAuth } from '@/contexts/AuthContext';
import { useIdleSessionTimeout } from '@/hooks/useIdleSessionTimeout';
import { clearSessionActivity } from '@/lib/session-idle';

export function SessionIdleGuard() {
  const { user, signOut } = useAuth();

  useIdleSessionTimeout({
    enabled: Boolean(user),
    onIdle: async () => {
      const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';

      clearSessionActivity();
      await signOut();
      window.location.assign(loginPath);
    },
  });

  return null;
}
