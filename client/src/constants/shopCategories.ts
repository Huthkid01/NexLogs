import type { PlatformType } from '@/types';
import { RDP_ICON_PATH } from '@/lib/platform-icons';

export const SHOP_CATEGORIES = [
  { slug: 'instagram', label: 'INSTAGRAM' },
  { slug: 'facebook', label: 'FACEBOOK' },
  { slug: 'x-twitter', label: 'TWITTER' },
  { slug: 'tiktok', label: 'TIKTOK' },
  { slug: 'snapchat', label: 'SNAPCHAT' },
  { slug: 'rdp', label: 'RDP' },
] as const;

export type ShopCategorySlug = (typeof SHOP_CATEGORIES)[number]['slug'];

export const SHOP_CATEGORY_PLATFORMS: Partial<Record<ShopCategorySlug, PlatformType>> = {
  instagram: 'instagram',
  facebook: 'facebook',
  'x-twitter': 'x',
  tiktok: 'tiktok',
  snapchat: 'snapchat',
};

export const SHOP_CATEGORY_ICON_PATHS: Partial<Record<ShopCategorySlug, string>> = {
  rdp: RDP_ICON_PATH,
};

export const SHOP_CATEGORY_LINKS: Partial<Record<ShopCategorySlug, string>> = {
  rdp: '/purchase-rdp',
};
