export const COMMUNITY_PROMO_JOINED_KEY = 'nexlogs-community-promo-joined';

export const COMMUNITY_LINKS = {
  whatsapp: 'https://chat.whatsapp.com/CjSVA2kB0CACkd38Cqd0Kr',
  tiktok: 'https://www.tiktok.com/@nexlogs',
  instagram: 'https://www.instagram.com/nexlogs',
} as const;

/** We cannot verify real WhatsApp/TikTok membership — joining = user clicked a community link or "I've joined". */
export function hasJoinedCommunityPromo(): boolean {
  try {
    return localStorage.getItem(COMMUNITY_PROMO_JOINED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markCommunityPromoJoined(): void {
  try {
    localStorage.setItem(COMMUNITY_PROMO_JOINED_KEY, '1');
    // Clear legacy dismiss key from earlier versions
    localStorage.removeItem('nexlogs-community-promo-dismissed');
  } catch {
    // ignore storage failures
  }
}
