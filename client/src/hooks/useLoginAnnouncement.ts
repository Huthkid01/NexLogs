import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  hasSeenLoginAnnouncement,
  markLoginAnnouncementSeen,
} from '@/lib/login-announcement';

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]);

const SHOW_DELAY_MS = 700;

function isBuyNumbersPath(pathname: string) {
  return pathname === '/buy-numbers' || pathname.startsWith('/buy-numbers/');
}

/** Post-login announcement only — never for guests, never on Buy Numbers pages. */
export function useLoginAnnouncement() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user?.id || profile?.role === 'admin') {
      setOpen(false);
      return;
    }

    if (AUTH_PATHS.has(location.pathname) || isBuyNumbersPath(location.pathname)) {
      setOpen(false);
      return;
    }

    if (hasSeenLoginAnnouncement(user.id)) {
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [loading, user?.id, profile?.role, location.pathname]);

  const dismiss = () => {
    if (user?.id) {
      markLoginAnnouncementSeen(user.id);
    }
    setOpen(false);
  };

  return { open, dismiss };
}
