import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  SiteContentContext,
  defaultSiteContent,
  mergeSiteContent,
  needsBuiltInHeroReset,
  STORAGE_KEY,
  type SiteContent,
} from '@/contexts/site-content';
import { CACHE_TIMES } from '@/lib/query-cache';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const FETCHED_AT_KEY = `${STORAGE_KEY}:fetchedAt`;
const HERO_MIGRATION_KEY = `${STORAGE_KEY}:hero-migration-v3`;

function clearStaleHeroCacheOnce() {
  try {
    if (localStorage.getItem(HERO_MIGRATION_KEY) === '1') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FETCHED_AT_KEY);
    localStorage.setItem(HERO_MIGRATION_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

clearStaleHeroCacheOnce();

function readStoredContent(): SiteContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return mergeSiteContent(JSON.parse(raw) as Partial<SiteContent>);
  } catch {
    return null;
  }
}

function readFetchedAt(): number {
  try {
    const raw = localStorage.getItem(FETCHED_AT_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function markFetchedNow() {
  try {
    localStorage.setItem(FETCHED_AT_KEY, String(Date.now()));
  } catch {
    // ignore quota / private mode
  }
}

function isSiteContentFresh() {
  const fetchedAt = readFetchedAt();
  if (!fetchedAt) return false;
  return Date.now() - fetchedAt < CACHE_TIMES.siteContentStaleMs;
}

async function fetchSiteContent(): Promise<{
  content: SiteContent;
  shouldPersistHeroReset: boolean;
} | null> {
  try {
    const { data, error } = await supabase.from('site_content_blocks').select('key, value');
    if (error) return null;

    const partial: Record<string, unknown> = {};
    (data || []).forEach((row) => {
      partial[String(row.key)] = row.value;
    });
    const rawSlides = (partial.slides as SiteContent['slides'] | undefined) ?? null;
    return {
      content: mergeSiteContent(partial as Partial<SiteContent>),
      shouldPersistHeroReset: needsBuiltInHeroReset(rawSlides),
    };
  } catch {
    return null;
  }
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [content, setContentState] = useState<SiteContent>(() => readStoredContent() ?? defaultSiteContent);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }, [content]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue) {
        setContentState(defaultSiteContent);
        return;
      }

      try {
        setContentState(mergeSiteContent(JSON.parse(event.newValue) as Partial<SiteContent>));
      } catch {
        return;
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setContent = useCallback((next: SiteContent) => {
    setContentState(next);
    markFetchedNow();

    if (!isAdmin || !user) return;

    const entries = Object.entries(next) as Array<[string, unknown]>;
    const payload = entries.map(([key, value]) => ({
      key,
      value,
      updated_by: user.id,
    }));

    void (async () => {
      try {
        const { error } = await supabase.from('site_content_blocks').upsert(payload as never, { onConflict: 'key' });
        if (error) return;
      } catch {
        return;
      }
    })();
  }, [isAdmin, user]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Guests/users: skip network if local copy is still fresh. Admins always refresh.
      // Always re-merge local copy so hero migrations apply without waiting for TTL.
      const stored = readStoredContent();
      if (stored) setContentState(stored);

      if (!isAdmin && isSiteContentFresh() && stored) return;

      const fetched = await fetchSiteContent();
      if (cancelled || !fetched) return;
      markFetchedNow();
      setContentState(fetched.content);

      // Persist restored Nexlogs heroes so Admin Slides / other clients stop serving stock banners.
      if (fetched.shouldPersistHeroReset && isAdmin && user) {
        setContent(fetched.content);
      }
    })();

    const channel = supabase
      .channel('site-content-live-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_content_blocks' },
        () => {
          void (async () => {
            const fetched = await fetchSiteContent();
            if (cancelled || !fetched) return;
            markFetchedNow();
            setContentState(fetched.content);
          })();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, setContent, user]);

  const resetContent = useCallback(() => setContent(defaultSiteContent), [setContent]);

  const value = useMemo(
    () => ({
      content,
      setContent,
      resetContent,
    }),
    [content, resetContent, setContent]
  );

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}
