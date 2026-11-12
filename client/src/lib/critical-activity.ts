import { useEffect } from 'react';

type Listener = (active: boolean) => void;

const locks = new Set<string>();
const listeners = new Set<Listener>();

function notify() {
  const active = locks.size > 0;
  for (const listener of listeners) listener(active);
}

/** Hold while payment/purchase must not be interrupted by soft deploy reload. */
export function beginCriticalActivity(id: string) {
  locks.add(id);
  notify();
}

export function endCriticalActivity(id: string) {
  locks.delete(id);
  notify();
}

export function isCriticalActivityActive() {
  return locks.size > 0;
}

export function subscribeCriticalActivity(listener: Listener) {
  listeners.add(listener);
  listener(locks.size > 0);
  return () => {
    listeners.delete(listener);
  };
}

/** Keeps a named lock while `active` is true. */
export function useCriticalActivityLock(id: string, active: boolean) {
  useEffect(() => {
    if (!active) return;
    beginCriticalActivity(id);
    return () => {
      endCriticalActivity(id);
    };
  }, [id, active]);
}
