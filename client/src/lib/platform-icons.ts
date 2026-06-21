import type { PlatformType, Product } from '@/types';
import { isRdpProduct } from '@/lib/rdp-utils';

export const PLATFORM_ICON_PATHS: Record<PlatformType, string> = {
  instagram: '/images/platforms/instagram.png',
  facebook: '/images/platforms/facebook.png',
  tiktok: '/images/platforms/tiktok.png',
  x: '/images/platforms/x.png',
  youtube: '/images/platforms/youtube.svg',
  snapchat: '/images/platforms/snapchat.svg',
};

export const RDP_ICON_PATH = '/images/platforms/rdp.svg';

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function getPlatformIconPath(platform: PlatformType) {
  return PLATFORM_ICON_PATHS[platform];
}

export function getProductIconPath(product: Pick<Product, 'slug' | 'platform'>) {
  if (isRdpProduct(product)) return RDP_ICON_PATH;
  return getPlatformIconPath(product.platform);
}

export function getProductIconPathFromSlug(slug: string, platform: PlatformType) {
  if (slug.includes('-rdp-')) return RDP_ICON_PATH;
  return getPlatformIconPath(platform);
}

export function getPlatformFromCategory(value: string): PlatformType | null {
  const normalized = normalizeValue(value);

  if (normalized.includes('instagram')) return 'instagram';
  if (normalized.includes('facebook')) return 'facebook';
  if (normalized.includes('tiktok')) return 'tiktok';
  if (normalized.includes('twitter') || normalized === 'x' || normalized.includes('x-twitter')) return 'x';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('snapchat')) return 'snapchat';

  return null;
}

export function getCategoryIconPath(input: { name?: string | null; slug?: string | null }) {
  const platform = getPlatformFromCategory(input.slug || input.name || '');
  return platform ? getPlatformIconPath(platform) : null;
}

