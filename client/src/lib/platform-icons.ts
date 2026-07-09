import type { PlatformType, Product } from '@/types';
import { isRdpProduct } from '@/lib/rdp-utils';

export const PLATFORM_ICON_PATHS: Record<PlatformType, string> = {
  instagram: '/images/platforms/instagram.png',
  facebook: '/images/platforms/facebook.png',
  tiktok: '/images/platforms/tiktok.png',
  x: '/images/platforms/x.png',
  youtube: '/images/platforms/youtube.svg',
  snapchat: '/images/platforms/snapchat.png',
};

export function resolveCategoryIconUrl(category?: {
  name?: string | null;
  slug?: string | null;
  image_url?: string | null;
} | null) {
  if (!category) return null;
  return normalizeIconUrl(category.image_url) || getCategoryIconPath(category);
}

export function resolveProductIconUrl(input: {
  slug: string;
  platform: PlatformType;
  category?: { name?: string | null; slug?: string | null; image_url?: string | null } | null;
  product_images?: { image_url: string; sort_order?: number }[] | null;
}) {
  const categoryIcon = resolveCategoryIconUrl(input.category);
  if (categoryIcon) return categoryIcon;

  const storedImage =
    input.product_images?.find((image) => image.sort_order === 0) ?? input.product_images?.[0];
  const storedIconUrl = normalizeIconUrl(storedImage?.image_url);
  if (storedIconUrl) return storedIconUrl;

  if (normalizeValue(input.slug).includes('telegram') || input.category?.slug === 'telegram') {
    return TELEGRAM_ICON_PATH;
  }

  return getProductIconPathFromSlug(input.slug, input.platform);
}

export const RDP_ICON_PATH = '/images/platforms/rdp.svg';
export const TELEGRAM_ICON_PATH = '/images/platforms/telegram.png';

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function normalizeIconUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith('/telegram.svg') || trimmed === 'telegram.svg') {
    return TELEGRAM_ICON_PATH;
  }
  return trimmed;
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
  if (slug.includes('telegram')) return TELEGRAM_ICON_PATH;
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
  if (normalized.includes('telegram')) return null;

  return null;
}

export function getCategoryIconPath(input: { name?: string | null; slug?: string | null }) {
  const normalized = normalizeValue(input.slug || input.name || '');
  if (normalized.includes('telegram')) return TELEGRAM_ICON_PATH;

  const platform = getPlatformFromCategory(normalized);
  return platform ? getPlatformIconPath(platform) : null;
}

