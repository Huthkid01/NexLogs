import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SiteContentContext, defaultSiteContent, mergeSiteContent, STORAGE_KEY, type SiteContent } from '@/contexts/site-content';
import { CACHE_TIMES } from '@/lib/query-cache';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const FETCHED_AT_KEY = `${STORAGE_KEY}:fetchedAt`;

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

async function fetchSiteContent(): Promise<SiteContent | null> {
  try {
    const { data, error } = await supabase.from('site_content_blocks').select('key, value');
    if (error) return null;

    const partial: Record<string, unknown> = {};
    (data || []).forEach((row) => {
      partial[String(row.key)] = row.value;
    });
    return mergeSiteContent(partial as Partial<SiteContent>);
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Guests/users: skip network if local copy is still fresh. Admins always refresh.
      if (!isAdmin && isSiteContentFresh() && readStoredContent()) return;

      const nextContent = await fetchSiteContent();
      if (cancelled || !nextContent) return;
      markFetchedNow();
      setContentState(nextContent);
    })();

    const channel = supabase
      .channel('site-content-live-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_content_blocks' },
        () => {
          void (async () => {
            const nextContent = await fetchSiteContent();
            if (cancelled || !nextContent) return;
            markFetchedNow();
            setContentState(nextContent);
          })();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [isAdmin]);

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
