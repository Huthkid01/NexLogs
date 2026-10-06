import { useEffect, useRef, useState } from 'react';
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

/** Post-login announcement only — once per login, never for guests, never on Buy Numbers. */
export function useLoginAnnouncement() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const shownForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user?.id) {
      // Allow the modal again after the next login in this tab.
      shownForUserRef.current = null;
      setOpen(false);
      return;
    }

    if (profile?.role === 'admin') {
      setOpen(false);
      return;
    }

    if (AUTH_PATHS.has(location.pathname) || isBuyNumbersPath(location.pathname)) {
      setOpen(false);
      return;
    }

    // Already shown for this login session — never reopen on marketplace revisits.
    if (shownForUserRef.current === user.id || hasSeenLoginAnnouncement(user.id)) {
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      shownForUserRef.current = user.id;
      markLoginAnnouncementSeen(user.id);
      setOpen(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [loading, user?.id, profile?.role, location.pathname]);

  const dismiss = () => {
    if (user?.id) {
      shownForUserRef.current = user.id;
      markLoginAnnouncementSeen(user.id);
    }
    setOpen(false);
  };

  return { open, dismiss };
}
