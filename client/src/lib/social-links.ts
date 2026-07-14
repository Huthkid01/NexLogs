import type { SiteContent } from '@/contexts/site-content';
import { DEFAULT_TELEGRAM_SUPPORT_URL, normalizeTelegramUrl } from '@/lib/telegram-url';

const EMPTY_INSTAGRAM_URLS = new Set(['', '#', 'https://instagram.com/', 'http://instagram.com/', 'instagram.com/']);

export function normalizeWhatsAppUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed === '#' ) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === 'wa.me') {
        const phone = url.pathname.replace(/^\//, '').split('/')[0]?.replace(/\D/g, '');
        return phone ? `https://wa.me/${phone}` : null;
      }
      if (url.hostname === 'api.whatsapp.com') {
        const phone = url.searchParams.get('phone')?.replace(/\D/g, '');
        return phone ? `https://wa.me/${phone}` : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    return `https://wa.me/${digits}`;
  }

  return null;
}

export function getWhatsAppSupportUrl(
  content: Pick<SiteContent, 'footer'>,
  fallback = 'https://wa.me/15855938030',
): string | null {
  const candidates = [
    content.footer.socialLinks.find((link) => link.label.toLowerCase() === 'whatsapp')?.href,
    fallback,
  ];

  for (const candidate of candidates) {
    const resolved = normalizeWhatsAppUrl(candidate);
    if (resolved) return resolved;
  }

  return null;
}

function formatCategoryProductName(label?: string) {
  if (!label) return null;
  if (label === 'RDP') return 'RDP';
  if (label === 'TWITTER') return 'Twitter/X';
  return label.charAt(0) + label.slice(1).toLowerCase();
}

export function buildProductRequestMessage({
  categoryLabel,
  searchQuery,
}: {
  categoryLabel?: string;
  searchQuery?: string;
}) {
  const productName = formatCategoryProductName(categoryLabel?.trim());
  const search = searchQuery?.trim();

  if (productName && search) {
    return `Hello, I need ${productName} (${search}) — which options do you have available?`;
  }

  if (productName) {
    return `Hello, I need ${productName} — which options do you have available?`;
  }

  if (search) {
    return `Hello, I'm looking for "${search}" on Nexlogs — what do you have available?`;
  }

  return 'Hello, I am browsing Nexlogs and need help finding products — what do you have available?';
}

export function appendWhatsAppMessage(baseUrl: string, message: string) {
  const url = new URL(baseUrl);
  url.searchParams.set('text', message);
  return url.toString();
}

export function normalizeInstagramUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || EMPTY_INSTAGRAM_URLS.has(trimmed.toLowerCase())) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === 'instagram.com' || url.hostname === 'www.instagram.com') {
        const username = url.pathname.replace(/^\//, '').split('/')[0]?.replace(/^@/, '');
        return username ? `https://instagram.com/${username}` : null;
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  if (/^instagram\.com\//i.test(trimmed)) {
    const username = trimmed.replace(/^instagram\.com\//i, '').split('/')[0]?.replace(/^@/, '');
    return username ? `https://instagram.com/${username}` : null;
  }

  const username = trimmed.replace(/^@/, '').replace(/\/$/, '');
  if (/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
    return `https://instagram.com/${username}`;
  }

  return null;
}

export function getInstagramSupportUrl(
  content: Pick<SiteContent, 'footer'>,
  fallback = 'https://instagram.com/nexlogs',
): string | null {
  const candidates = [
    content.footer.socialLinks.find((link) => link.label.toLowerCase() === 'instagram')?.href,
    ...content.footer.socialLinks.map((link) => link.href),
  ];

  for (const candidate of candidates) {
    const resolved = normalizeInstagramUrl(candidate);
    if (resolved) return resolved;
  }

  return normalizeInstagramUrl(fallback);
}

export function resolveSocialLinkHref(label: string, href: string): string {
  if (label.toLowerCase() === 'telegram') {
    return normalizeTelegramUrl(href) ?? DEFAULT_TELEGRAM_SUPPORT_URL;
  }
  if (label.toLowerCase() === 'whatsapp') {
    return normalizeWhatsAppUrl(href) ?? href;
  }
  if (label.toLowerCase() === 'instagram') {
    return normalizeInstagramUrl(href) ?? href;
  }
  return href;
}
