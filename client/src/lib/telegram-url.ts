import type { SiteContent } from '@/contexts/site-content';

const EMPTY_TELEGRAM_URLS = new Set(['', '#', 'https://t.me/', 'http://t.me/', 't.me/', 't.me']);

/** Turn @nexlogs, nexlogs, or t.me/nexlogs into https://t.me/nexlogs */
export function normalizeTelegramUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || EMPTY_TELEGRAM_URLS.has(trimmed.toLowerCase())) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === 't.me' || url.hostname === 'telegram.me') {
        const username = url.pathname.replace(/^\//, '').split('/')[0]?.replace(/^@/, '');
        return username ? `https://t.me/${username}` : null;
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  if (/^t\.me\//i.test(trimmed)) {
    const username = trimmed.replace(/^t\.me\//i, '').split('/')[0]?.replace(/^@/, '');
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
  fallback = 'https://t.me/nexlogs'
): string {
  const candidates = [
    content.support.channels.find((channel) => channel.title.toLowerCase() === 'telegram')?.href,
    content.footer.socialLinks.find((link) => link.label.toLowerCase() === 'telegram')?.href,
    ...content.support.channels.map((channel) => channel.href),
    ...content.footer.socialLinks.map((link) => link.href),
  ];

  for (const candidate of candidates) {
    const resolved = normalizeTelegramUrl(candidate);
    if (resolved) return resolved;
  }

  return fallback;
}

export function resolveSocialLinkHref(label: string, href: string): string {
  if (label.toLowerCase() === 'telegram') {
    return normalizeTelegramUrl(href) ?? href;
  }
  return href;
}
