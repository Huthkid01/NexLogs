import { useEffect, useRef } from 'react';

const CURRENT_BUILD_ID = String(import.meta.env.VITE_APP_BUILD_ID || '').trim();
const CHECK_INTERVAL_MS = 45_000;

type VersionPayload = {
  buildId?: string;
};

/**
 * When a new Vercel deploy goes live, soft-reload so users pick up new JS/CSS
 * without a manual hard refresh. Hashed assets already bust cache; this only
 * swaps to the new index/entry.
 */
export function DeployUpdateWatcher() {
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (!CURRENT_BUILD_ID || import.meta.env.DEV) return;

    const applyIfNewer = async () => {
      if (reloadingRef.current || document.hidden) return;

      try {
        const response = await fetch(`/version.json?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as VersionPayload;
        const remoteBuildId = String(payload.buildId || '').trim();
        if (!remoteBuildId || remoteBuildId === CURRENT_BUILD_ID) return;

        reloadingRef.current = true;
        window.location.reload();
      } catch {
        // Offline / blocked — ignore and retry later.
      }
    };

    const intervalId = window.setInterval(() => {
      void applyIfNewer();
    }, CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void applyIfNewer();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    void applyIfNewer();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return null;
}
