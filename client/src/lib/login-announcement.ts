import { DEFAULT_TELEGRAM_SUPPORT_URL } from '@/lib/telegram-url';

/** Shown once per login session (cleared on logout). */
const SESSION_KEY = 'nexlogs-login-announcement-seen';

export function hasSeenLoginAnnouncement(userId: string) {
  try {
    return sessionStorage.getItem(`${SESSION_KEY}:${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markLoginAnnouncementSeen(userId: string) {
  try {
    sessionStorage.setItem(`${SESSION_KEY}:${userId}`, '1');
  } catch {
    // Ignore storage errors (private browsing, etc.).
  }
}

/** Call on sign-out so the next login shows the announcement again. */
export function clearLoginAnnouncementForUser(userId?: string | null) {
  try {
    if (userId) {
      sessionStorage.removeItem(`${SESSION_KEY}:${userId}`);
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`${SESSION_KEY}:`)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage errors.
  }
}

export const LOGIN_ANNOUNCEMENT = {
  title: 'Welcome back to Nexlogs',
  body: 'Want to own a website like Nexlogs where you can sell logs and verification numbers? Get started from 100K — tap below to chat with support.',
  ctaLabel: 'Chat on Telegram',
  ctaHref: DEFAULT_TELEGRAM_SUPPORT_URL,
} as const;
