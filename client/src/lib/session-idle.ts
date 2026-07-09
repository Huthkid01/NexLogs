const DEFAULT_IDLE_MINUTES = 45;
const MIN_IDLE_MINUTES = 30;
const MAX_IDLE_MINUTES = 60;

export const LAST_ACTIVITY_STORAGE_KEY = 'nexlogs-last-activity-at';

function parseIdleMinutes(): number {
  const raw = import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES?.trim();
  if (!raw) return DEFAULT_IDLE_MINUTES;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_IDLE_MINUTES;

  return Math.min(MAX_IDLE_MINUTES, Math.max(MIN_IDLE_MINUTES, Math.round(parsed)));
}

export const SESSION_IDLE_TIMEOUT_MS = parseIdleMinutes() * 60 * 1000;

export function touchSessionActivity(timestamp = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp));
}

export function clearSessionActivity() {
  localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
}

export function getSessionLastActivity(): number {
  const stored = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function isSessionIdle(now = Date.now()): boolean {
  return now - getSessionLastActivity() >= SESSION_IDLE_TIMEOUT_MS;
}
