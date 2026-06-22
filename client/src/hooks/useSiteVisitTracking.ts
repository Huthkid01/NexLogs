import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMarketplaceVisitBasePath } from '@/lib/marketplace-visit-path';
import { siteVisitService } from '@/services/site-visit.service';

/** Record one visit when someone lands on the homepage or marketplace (guest or registered). */
export function useSiteVisitTracking() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const lastPathRef = useRef<string | null>(null);
  const marketplaceBasePath = getMarketplaceVisitBasePath(location.pathname);

  useEffect(() => {
    if (isAdmin || !marketplaceBasePath) return;

    const path = `${location.pathname}${location.search}`;
    if (lastPathRef.current === path) return;

    lastPathRef.current = path;
    void siteVisitService.record(path);
  }, [location.pathname, location.search, isAdmin, marketplaceBasePath]);
}
