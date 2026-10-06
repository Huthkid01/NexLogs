import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  markQuickTourCompleted,
  QUICK_TOUR_OPEN_EVENT,
} from '@/lib/quick-tour';

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]);

/** Quick tour is menu/profile-only — never auto-opens after login. */
export function useQuickTour() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleManualOpen = () => {
      if (loading) return;
      if (!user?.id || profile?.role === 'admin' || AUTH_PATHS.has(location.pathname)) {
        return;
      }
      setOpen(true);
    };

    window.addEventListener(QUICK_TOUR_OPEN_EVENT, handleManualOpen);
    return () => window.removeEventListener(QUICK_TOUR_OPEN_EVENT, handleManualOpen);
  }, [loading, user?.id, profile?.role, location.pathname]);

  useEffect(() => {
    if (!user?.id || profile?.role === 'admin' || AUTH_PATHS.has(location.pathname)) {
      setOpen(false);
    }
  }, [user?.id, profile?.role, location.pathname]);

  const completeTour = () => {
    if (user?.id) {
      markQuickTourCompleted(user.id);
    }
    setOpen(false);
  };

  const dismissTour = () => {
    if (user?.id) {
      markQuickTourCompleted(user.id);
    }
    setOpen(false);
  };

  return {
    open,
    completeTour,
    dismissTour,
  };
}
