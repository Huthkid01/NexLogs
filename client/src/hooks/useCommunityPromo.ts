import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  hasJoinedCommunityPromo,
  markCommunityPromoJoined,
} from '@/lib/community-promo';

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]);

const SHOW_DELAY_MS = 1_200;

export function useCommunityPromo() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  /** Keeps "Maybe later" closed during SPA navigation; resets on full page reload. */
  const closedThisVisitRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (user?.id || hasJoinedCommunityPromo()) {
      setOpen(false);
      return;
    }

    if (AUTH_PATHS.has(location.pathname)) {
      setOpen(false);
      return;
    }

    if (closedThisVisitRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [loading, user?.id, location.pathname]);

  const dismiss = () => {
    closedThisVisitRef.current = true;
    setOpen(false);
  };

  const markJoined = () => {
    markCommunityPromoJoined();
    closedThisVisitRef.current = true;
    setOpen(false);
  };

  return { open, dismiss, markJoined };
}
