import type { PlatformType } from '@/types';

export const SHOP_CATEGORIES = [
  { slug: 'instagram', label: 'INSTAGRAM' },
  { slug: 'facebook', label: 'FACEBOOK' },
  { slug: 'x-twitter', label: 'TWITTER' },
  { slug: 'tiktok', label: 'TIKTOK' },
] as const;

export type ShopCategorySlug = (typeof SHOP_CATEGORIES)[number]['slug'];

export const SHOP_CATEGORY_PLATFORMS: Record<ShopCategorySlug, PlatformType> = {
  instagram: 'instagram',
  facebook: 'facebook',
  'x-twitter': 'x',
  tiktok: 'tiktok',
};
