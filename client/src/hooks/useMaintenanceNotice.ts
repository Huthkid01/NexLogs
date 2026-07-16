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

    // Allow login so admins can sign in during maintenance. Admin dashboard uses a separate layout.
    if (!enabled || isAdmin || AUTH_PATHS.has(location.pathname)) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [loading, enabled, isAdmin, location.pathname]);

  return {
    open,
    title,
    message,
  };
}
