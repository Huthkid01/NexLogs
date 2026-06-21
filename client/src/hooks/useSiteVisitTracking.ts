import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isMockMode } from '@/lib/mock-mode';
import { siteVisitService } from '@/services/site-visit.service';

const HEARTBEAT_MS = 2 * 60 * 1000;

function shouldTrackVisit(pathname: string, isAdmin: boolean) {
  if (isAdmin) return false;
  if (pathname.startsWith('/admin')) return false;
  return true;
}

export function useSiteVisitTracking() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (isMockMode()) return;
    if (!shouldTrackVisit(location.pathname, isAdmin)) return;

    const path = `${location.pathname}${location.search}`;
    if (lastPathRef.current === path) return;

    lastPathRef.current = path;
    void siteVisitService.record(path);
  }, [location.pathname, location.search, isAdmin]);

  useEffect(() => {
    if (isMockMode()) return;
    if (!shouldTrackVisit(location.pathname, isAdmin)) return;

    const heartbeat = window.setInterval(() => {
      const path = `${location.pathname}${location.search}`;
      void siteVisitService.record(path);
    }, HEARTBEAT_MS);

    return () => window.clearInterval(heartbeat);
  }, [location.pathname, location.search, isAdmin]);
}
