import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  hasCompletedQuickTour,
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

export function useQuickTour() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleManualOpen = () => {
      if (!user?.id || profile?.role === 'admin' || AUTH_PATHS.has(location.pathname)) {
        return;
      }
      setOpen(true);
    };

    window.addEventListener(QUICK_TOUR_OPEN_EVENT, handleManualOpen);
    return () => window.removeEventListener(QUICK_TOUR_OPEN_EVENT, handleManualOpen);
  }, [user?.id, profile?.role, location.pathname]);

  useEffect(() => {
    if (loading) return;

    if (!user?.id || profile?.role === 'admin') {
      setOpen(false);
      return;
    }

    if (AUTH_PATHS.has(location.pathname)) {
      return;
    }

    if (hasCompletedQuickTour(user.id)) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [loading, user?.id, profile?.role, location.pathname]);

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
