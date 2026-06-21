import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SiteContentContext, defaultSiteContent, mergeSiteContent, STORAGE_KEY, type SiteContent } from '@/contexts/site-content';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function readStoredContent(): SiteContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return mergeSiteContent(JSON.parse(raw) as Partial<SiteContent>);
  } catch {
    return null;
  }
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
      const nextContent = await fetchSiteContent();
      if (cancelled || !nextContent) return;
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
            setContentState(nextContent);
          })();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const setContent = useCallback((next: SiteContent) => {
    setContentState(next);

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
