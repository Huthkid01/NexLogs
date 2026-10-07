/**
 * Live support call is OFF unless explicitly enabled.
 * When off, the site behaves exactly as before (Telegram only).
 */
export function isLiveSupportCallEnabled() {
  return String(import.meta.env.VITE_LIVE_SUPPORT_CALL_ENABLED || '').toLowerCase() === 'true';
}
