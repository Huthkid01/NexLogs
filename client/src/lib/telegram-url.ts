import type { SiteContent } from '@/contexts/site-content';

const EMPTY_TELEGRAM_URLS = new Set(['', '#', 'https://t.me/', 'http://t.me/', 't.me/', 't.me']);
const TELEGRAM_HOSTS = new Set(['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me']);
export const DEFAULT_TELEGRAM_SUPPORT_URL = 'https://t.me/nexlogs';

function isTelegramHost(hostname: string): boolean {
  return TELEGRAM_HOSTS.has(hostname.toLowerCase());
}

/** Turn @nexlogs, nexlogs, or t.me/nexlogs into https://t.me/nexlogs (never http). */
export function normalizeTelegramUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || EMPTY_TELEGRAM_URLS.has(trimmed.toLowerCase())) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!isTelegramHost(url.hostname)) return null;
      const username = url.pathname.replace(/^\//, '').split('/')[0]?.replace(/^@/, '');
      return username ? `https://t.me/${username}` : null;
    } catch {
      return null;
    }
  }

  if (/^(?:www\.)?t\.me\//i.test(trimmed) || /^(?:www\.)?telegram\.me\//i.test(trimmed)) {
    const username = trimmed
      .replace(/^(?:www\.)?(?:t\.me|telegram\.me)\//i, '')
      .split('/')[0]
      ?.replace(/^@/, '');
    return username ? `https://t.me/${username}` : null;
  }

  const username = trimmed.replace(/^@/, '').replace(/\/$/, '');
  if (/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) {
    return `https://t.me/${username}`;
  }

  return null;
}

export function getTelegramSupportUrl(
  content: Pick<SiteContent, 'support' | 'footer'>,
  fallback = DEFAULT_TELEGRAM_SUPPORT_URL,
): string {
  const candidates = [
    content.support.channels.find((channel) => channel.title.toLowerCase() === 'telegram')?.href,
    content.footer.socialLinks.find((link) => link.label.toLowerCase() === 'telegram')?.href,
  ];

  for (const candidate of candidates) {
    const resolved = normalizeTelegramUrl(candidate);
    if (resolved) return resolved;
  }

  return normalizeTelegramUrl(fallback) ?? DEFAULT_TELEGRAM_SUPPORT_URL;
}
