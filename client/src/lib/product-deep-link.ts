import { isRdpProductSlug } from '@/lib/rdp-utils';

export function buildProductMarketplacePath(slug: string) {
  if (isRdpProductSlug(slug)) return '/purchase-rdp';
  return `/marketplace?product=${encodeURIComponent(slug)}`;
}

export function buildProductMarketplaceUrl(appUrl: string, slug: string) {
  const base = appUrl.replace(/\/$/, '');
  return `${base}${buildProductMarketplacePath(slug)}`;
}
