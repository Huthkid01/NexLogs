import { isRdpProductSlug } from '@/lib/rdp-utils';

export function buildProductMarketplacePath(slug: string) {
  if (isRdpProductSlug(slug)) return '/purchase-rdp';
  // Prefer public homepage deep links so guests/crawlers are not bounced to /marketplace auth.
  return `/?product=${encodeURIComponent(slug)}`;
}

export function buildProductMarketplaceUrl(appUrl: string, slug: string) {
  const base = appUrl.replace(/\/$/, '');
  return `${base}${buildProductMarketplacePath(slug)}`;
}
