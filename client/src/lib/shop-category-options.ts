import {
  SHOP_CATEGORIES,
  SHOP_CATEGORY_ICON_PATHS,
  SHOP_CATEGORY_LINKS,
  SHOP_CATEGORY_PLATFORMS,
  type ShopCategorySlug,
} from '@/constants/shopCategories';
import type { Category } from '@/types';

export interface ShopCategoryOption {
  slug: string;
  label: string;
  imageUrl?: string | null;
  platform?: (typeof SHOP_CATEGORY_PLATFORMS)[ShopCategorySlug];
  externalLink?: string;
  sortOrder: number;
}

const STATIC_SLUGS = new Set<string>(SHOP_CATEGORIES.map((category) => category.slug));

export function buildShopCategoryOptions(categories: Category[] = []): ShopCategoryOption[] {
  const staticOptions: ShopCategoryOption[] = SHOP_CATEGORIES.map((category, index) => ({
    slug: category.slug,
    label: category.label,
    imageUrl: SHOP_CATEGORY_ICON_PATHS[category.slug] ?? null,
    platform: SHOP_CATEGORY_PLATFORMS[category.slug],
    externalLink: SHOP_CATEGORY_LINKS[category.slug],
    sortOrder: index,
  }));

  const dynamicOptions = categories
    .filter((category) => category.is_active && !STATIC_SLUGS.has(category.slug))
    .map((category) => ({
      slug: category.slug,
      label: category.name.trim().toUpperCase() || category.slug.toUpperCase(),
      imageUrl: category.image_url,
      sortOrder: category.sort_order,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return [...staticOptions, ...dynamicOptions];
}

export function findShopCategoryOption(
  options: ShopCategoryOption[],
  slug: string,
): ShopCategoryOption | undefined {
  return options.find((option) => option.slug === slug);
}
