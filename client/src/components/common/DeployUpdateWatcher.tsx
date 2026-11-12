import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isCriticalActivityActive,
  subscribeCriticalActivity,
} from '@/lib/critical-activity';

const CURRENT_BUILD_ID = String(import.meta.env.VITE_APP_BUILD_ID || '').trim();
const CHECK_INTERVAL_MS = 45_000;

type VersionPayload = {
  buildId?: string;
};

function isReloadBlockedByRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/add-funds') return true;
  if (path === '/buy-numbers') return true;
  if (path === '/purchase-rdp') return true;
  // Returning from Kora with a payment reference — never interrupt verify.
  if (new URLSearchParams(window.location.search).has('reference')) return true;
  return false;
}

function shouldDeferReload() {
  return isReloadBlockedByRoute() || isCriticalActivityActive();
}

/**
 * When a new Vercel deploy goes live, soft-reload so users pick up new JS/CSS.
 * Defers reload during add-funds / checkout / in-flight payment or purchase,
 * and shows an "Update available" banner until it is safe.
 */
export function DeployUpdateWatcher() {
  const reloadingRef = useRef(false);
  const pendingUpdateRef = useRef(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const reloadNow = useCallback(() => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    window.location.reload();
  }, []);

  const applyIfNewer = useCallback(async () => {
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

      pendingUpdateRef.current = true;
      setUpdateAvailable(true);

      if (shouldDeferReload()) return;
      reloadNow();
    } catch {
      // Offline / blocked — ignore and retry later.
    }
  }, [reloadNow]);

  const tryReloadWhenSafe = useCallback(() => {
    if (reloadingRef.current || !pendingUpdateRef.current) return;
    if (shouldDeferReload()) {
      setUpdateAvailable(true);
      return;
    }
    reloadNow();
  }, [reloadNow]);

  useEffect(() => {
    if (!CURRENT_BUILD_ID || import.meta.env.DEV) return;

    const intervalId = window.setInterval(() => {
      void applyIfNewer();
    }, CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void applyIfNewer();
        tryReloadWhenSafe();
      }
    };

    const onFocus = () => {
      void applyIfNewer();
      tryReloadWhenSafe();
    };

    // Detect client-side navigations away from blocked routes.
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    const onHistoryChange = () => {
      window.setTimeout(() => tryReloadWhenSafe(), 0);
    };

    history.pushState = (...args: Parameters<History['pushState']>) => {
      originalPushState(...args);
      onHistoryChange();
    };
    history.replaceState = (...args: Parameters<History['replaceState']>) => {
      originalReplaceState(...args);
      onHistoryChange();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('popstate', onHistoryChange);

    const unsubscribe = subscribeCriticalActivity(() => {
      tryReloadWhenSafe();
    });

    void applyIfNewer();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('popstate', onHistoryChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      unsubscribe();
    };
  }, [applyIfNewer, tryReloadWhenSafe]);

  const previewForced =
    import.meta.env.DEV
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('previewUpdateBanner') === '1';

  if ((!updateAvailable && !previewForced) || (!CURRENT_BUILD_ID && !previewForced)) return null;
  if (import.meta.env.DEV && !previewForced) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4 safe-bottom">
      <div className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-2xl border border-[#f26522]/30 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] dark:border-[#f26522]/40 dark:bg-[#0b1628] dark:text-slate-100">
        <div className="min-w-0">
          <p className="font-semibold">Update available</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A newer version of Nexlogs is ready.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-xl bg-[#f26522] px-3 py-2 text-xs font-semibold text-white hover:bg-[#d94e0f]"
          onClick={previewForced ? () => undefined : reloadNow}
        >
          Reload now
        </button>
      </div>
    </div>
  );
}
