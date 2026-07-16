import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/hooks/useSiteContent';

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]);

const SESSION_DISMISS_KEY = 'nexlogs-maintenance-dismissed-session';

export function useMaintenanceNotice() {
  const { isAdmin, loading } = useAuth();
  const { content } = useSiteContent();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const enabled = Boolean(content.maintenance?.enabled);
  const title = content.maintenance?.title || 'Scheduled maintenance';
  const message =
    content.maintenance?.message ||
    'Nexlogs is undergoing scheduled maintenance. Please check back shortly.';

  useEffect(() => {
    if (loading) return;

    if (!enabled || isAdmin || AUTH_PATHS.has(location.pathname)) {
      setOpen(false);
      return;
    }

    try {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
        setOpen(false);
        return;
      }
    } catch {
      // ignore
    }

    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, [loading, enabled, isAdmin, location.pathname]);

  // When admin turns maintenance off, clear session dismiss so it can show again next time.
  useEffect(() => {
    if (enabled) return;
    try {
      sessionStorage.removeItem(SESSION_DISMISS_KEY);
    } catch {
      // ignore
    }
  }, [enabled]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return {
    open,
    title,
    message,
    dismiss,
  };
}
