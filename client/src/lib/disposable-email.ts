/**
 * Blocks disposable / temporary email domains used by signup spam bots.
 * Does not affect search-engine crawling (crawlers never POST /register).
 */

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Seen on Nexlogs spam wave (2026-11-12)
  'guerrillamailblock.com',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'sharklasers.com',
  'grr.la',
  'guerrillamail.info',
  'pokemail.net',
  'spam4.me',
  'marchslurp.com',
  'arcadehearth.com',
  '91w.arcadehearth.com',
  'roomsranked.com',
  'eme.roomsranked.com',
  // Common temp-mail providers
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tmpmail.org',
  'tmpmail.net',
  '10minutemail.com',
  '10minutemail.net',
  '10minemail.com',
  'throwawaymail.com',
  'throwaway.email',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.me',
  'trashmail.net',
  'getnada.com',
  'nada.email',
  'emailondeck.com',
  'fakeinbox.com',
  'maildrop.cc',
  'dispostable.com',
  'mailnesia.com',
  'moakt.com',
  'tempail.com',
  'tempr.email',
  'discard.email',
  'discardmail.com',
  'mailcatch.com',
  'mytrashmail.com',
  'mintemail.com',
  'spamgourmet.com',
  'mailnull.com',
  'spamfree24.org',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'trash-mail.com',
  'crazymailing.com',
  'inboxkitten.com',
  'guerillamail.com',
  'mailtemp.net',
  'tempinbox.com',
  'burnermail.io',
  'mailforspam.com',
  'spamobox.com',
  'jetable.org',
  'nwldx.com',
  'getairmail.com',
  'mohmal.com',
  'emailtemporanea.com',
  'emailtemporanea.net',
  'temporary-mail.net',
  'tempmailo.com',
  'tmpbox.net',
  'dropmail.me',
  'mailpoof.com',
  'harakirimail.com',
  'spamherelots.com',
]);

/** Domain suffixes / fragments that almost always mean throwaway mail. */
const DISPOSABLE_EMAIL_SUFFIXES = [
  'guerrillamail',
  'mailinator',
  'tempmail',
  'temp-mail',
  'tmpmail',
  'throwaway',
  'yopmail',
  'trashmail',
  'discardmail',
  '10minutemail',
  '10minemail',
  'fakeinbox',
  'maildrop',
  'mailnesia',
  'burnermail',
  'spamgourmet',
  'wegwerfmail',
  'jetable',
  'mohmal',
  'dropmail',
  'harakirimail',
  'inboxkitten',
  'mailtemp',
  'tempail',
  'tempr.email',
  'getnada',
  'dispostable',
  'mailnull',
  'spamfree24',
  'crazymailing',
  'temporary-mail',
  'tempmailo',
  'tmpbox',
  'mailpoof',
  'spamherelots',
  'emailtemporanea',
  'guerillamail',
  'arcadehearth',
  'roomsranked',
  'marchslurp',
  'guerrillamailblock',
  'sharklasers',
  'pokemail',
];

export const DISPOSABLE_EMAIL_MESSAGE =
  'Temporary or disposable email addresses are not allowed. Please use a permanent email.';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function extractDomain(email: string) {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return '';
  return email.slice(at + 1);
}

export function isDisposableEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const domain = extractDomain(normalized);
  if (!domain || !domain.includes('.')) return false;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;

  // Also match parent domains (e.g. foo.mailinator.com)
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i += 1) {
    const candidate = parts.slice(i).join('.');
    if (DISPOSABLE_EMAIL_DOMAINS.has(candidate)) return true;
  }

  return DISPOSABLE_EMAIL_SUFFIXES.some((needle) => domain.includes(needle));
}

export function assertNotDisposableEmail(email: string) {
  if (isDisposableEmail(email)) {
    throw new Error(DISPOSABLE_EMAIL_MESSAGE);
  }
}
