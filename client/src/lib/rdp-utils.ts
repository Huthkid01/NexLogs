import type { Product } from '@/types';

export const RDP_PENDING_DETAILS_MESSAGE =
  'Purchase completed. Your RDP details are being prepared — check back within 5 to 10 minutes.';

export function isRdpProduct(product: Pick<Product, 'slug'> | null | undefined): boolean {
  return Boolean(product?.slug?.includes('-rdp-'));
}

export function isRdpProductSlug(slug: string | null | undefined): boolean {
  return Boolean(slug?.includes('-rdp-'));
}

export function isRdpFormProduct(input: {
  slug?: string | null;
  niche?: string | null;
  categorySlug?: string | null;
}): boolean {
  if (isRdpProductSlug(input.slug)) return true;
  if (input.niche?.trim().toLowerCase() === 'rdp') return true;
  if (input.categorySlug === 'rdp') return true;
  return false;
}
