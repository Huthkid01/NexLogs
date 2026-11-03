import { getLoggsplugProductIconUrl, isLoggsplugProduct } from '@/lib/loggsplug-utils';
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
  // Prefer known local icons so Loggsplug placeholder "?" images don't win.
  return getCategoryIconPath(category) || normalizeIconUrl(category.image_url);
}

export function resolveProductIconUrl(input: {
  slug: string;
  platform: PlatformType;
  supplier?: string | null;
  supplier_product_id?: number | null;
  category?: { name?: string | null; slug?: string | null; image_url?: string | null } | null;
  product_images?: { image_url: string; sort_order?: number }[] | null;
  preview_url?: string | null;
}) {
  const isSupplierProduct = isLoggsplugProduct({
    supplier: input.supplier,
    supplier_product_id: input.supplier_product_id,
  });

  if (isSupplierProduct) {
    const loggsplugIcon = getLoggsplugProductIconUrl({
      supplier: input.supplier,
      supplier_product_id: input.supplier_product_id,
      product_images: input.product_images,
      preview_url: input.preview_url,
    });
    if (loggsplugIcon) return loggsplugIcon;
  }

  const storedImage =
    input.product_images?.find((image) => image.sort_order === 0) ?? input.product_images?.[0];
  const storedIconUrl = normalizeIconUrl(storedImage?.image_url);
  if (storedIconUrl) return storedIconUrl;

  if (!isSupplierProduct) {
    const categoryIcon = resolveCategoryIconUrl(input.category);
    if (categoryIcon) return categoryIcon;
  }

  if (normalizeValue(input.slug).includes('telegram') || input.category?.slug === 'telegram') {
    return TELEGRAM_ICON_PATH;
  }

  return getProductIconPathFromSlug(input.slug, input.platform);
}

export const RDP_ICON_PATH = '/images/platforms/rdp.svg';
export const TELEGRAM_ICON_PATH = '/images/platforms/telegram.png';
export const TOOLS_ICON_PATH = '/images/platforms/tools.svg';
export const VPN_ICON_PATH = '/images/platforms/vpn.svg';
export const DISCORD_ICON_PATH = '/images/platforms/discord.svg';
export const REDDIT_ICON_PATH = '/images/platforms/reddit.svg';
export const THREADS_ICON_PATH = '/images/platforms/threads.svg';
export const OFFERS_ICON_PATH = '/images/platforms/offers.svg';
export const MAIL_ICON_PATH = '/images/platforms/mail.svg';
export const TEXTING_ICON_PATH = '/images/platforms/texting.svg';

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
  // Use both slug + name so "DISCORD HQ..." with slug "accounts" still maps correctly.
  const normalized = normalizeValue(`${input.slug || ''} ${input.name || ''}`);
  if (!normalized.trim()) return null;

  if (normalized.includes('telegram')) return TELEGRAM_ICON_PATH;
  if (normalized.includes('rdp')) return RDP_ICON_PATH;
  if (normalized.includes('discord')) return DISCORD_ICON_PATH;
  if (normalized.includes('reddit')) return REDDIT_ICON_PATH;
  if (normalized.includes('threads')) return THREADS_ICON_PATH;
  if (normalized.includes('vpn') || normalized.includes('proxy')) return VPN_ICON_PATH;
  if (
    normalized.includes('tool')
    || normalized.includes('tutorial')
    || normalized.includes('guide')
  ) {
    return TOOLS_ICON_PATH;
  }
  if (
    normalized.includes('mail')
    || normalized.includes('icloud')
    || normalized.includes('gmail')
  ) {
    return MAIL_ICON_PATH;
  }
  if (
    normalized.includes('texting')
    || normalized.includes('sms')
    || /\bnumbers?\b/.test(normalized)
  ) {
    return TEXTING_ICON_PATH;
  }
  if (
    normalized.includes('offer')
    || normalized.includes('nexlogs')
    || normalized.includes('loggsplug')
  ) {
    return OFFERS_ICON_PATH;
  }
  if (normalized.includes('truth')) return PLATFORM_ICON_PATHS.x;

  const platform = getPlatformFromCategory(normalized);
  return platform ? getPlatformIconPath(platform) : null;
}

