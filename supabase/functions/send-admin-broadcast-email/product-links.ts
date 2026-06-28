export function isRdpProductSlug(slug: string) {
  return slug.includes('-rdp-');
}

export function buildProductMarketplaceUrl(appUrl: string, slug: string) {
  const base = appUrl.replace(/\/$/, '');
  if (isRdpProductSlug(slug)) {
    return `${base}/purchase-rdp`;
  }
  return `${base}/marketplace?product=${encodeURIComponent(slug)}`;
}
