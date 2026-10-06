/** Fixed idle logout: 20 minutes of no activity signs the customer out. */
export const SESSION_IDLE_TIMEOUT_MINUTES = 20;
export const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;

export const LAST_ACTIVITY_STORAGE_KEY = 'nexlogs-last-activity-at';

export function touchSessionActivity(timestamp = Date.now()) {
  try {
    localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp));
  } catch {
    // Private mode / blocked storage — keep in-memory fallback via callers.
  }
}

export function clearSessionActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function getSessionLastActivity(): number {
  try {
    const stored = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

export function isSessionIdle(now = Date.now()): boolean {
  return now - getSessionLastActivity() >= SESSION_IDLE_TIMEOUT_MS;
}
