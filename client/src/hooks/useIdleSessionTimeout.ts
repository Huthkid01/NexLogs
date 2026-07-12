import { useEffect, useRef } from 'react';
import {
  getSessionLastActivity,
  isSessionIdle,
  LAST_ACTIVITY_STORAGE_KEY,
  SESSION_IDLE_TIMEOUT_MS,
  touchSessionActivity,
} from '@/lib/session-idle';

const ACTIVITY_THROTTLE_MS = 15_000;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll', 'mousemove'] as const;

interface UseIdleSessionTimeoutOptions {
  enabled: boolean;
  onIdle: () => void | Promise<void>;
}

export function useIdleSessionTimeout({ enabled, onIdle }: UseIdleSessionTimeoutOptions) {
  const onIdleRef = useRef(onIdle);
  const handlingIdleRef = useRef(false);
  const lastTouchRef = useRef(0);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasEnabledRef = useRef(false);

  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) {
      wasEnabledRef.current = false;
      return;
    }

    const justAuthenticated = !wasEnabledRef.current;
    wasEnabledRef.current = true;

    if (justAuthenticated) {
      touchSessionActivity();
    }

    const hasStoredActivity = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY) != null;

    const clearScheduledCheck = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };

    const handleIdle = async () => {
      if (handlingIdleRef.current || !isSessionIdle()) return;

      handlingIdleRef.current = true;
      clearScheduledCheck();

      try {
        await onIdleRef.current();
      } finally {
        handlingIdleRef.current = false;
      }
    };

    const scheduleCheck = () => {
      clearScheduledCheck();

      const remaining = SESSION_IDLE_TIMEOUT_MS - (Date.now() - getSessionLastActivity());
      if (remaining <= 0) {
        void handleIdle();
        return;
      }

      timeoutIdRef.current = setTimeout(() => {
        void handleIdle();
      }, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < ACTIVITY_THROTTLE_MS) return;

      lastTouchRef.current = now;
      touchSessionActivity(now);
      scheduleCheck();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      if (isSessionIdle()) {
        void handleIdle();
        return;
      }

      scheduleCheck();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LAST_ACTIVITY_STORAGE_KEY) return;

      if (isSessionIdle()) {
        void handleIdle();
        return;
      }

      scheduleCheck();
    };

    if (hasStoredActivity && isSessionIdle() && !justAuthenticated) {
      void handleIdle();
      return;
    }

    if (!hasStoredActivity) {
      touchSessionActivity();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);

    scheduleCheck();

    return () => {
      clearScheduledCheck();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled]);
}
