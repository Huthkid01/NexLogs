import type { PlatformType } from '@/types';

/** Platforms / category slugs that currently have in-stock own products (not Loggsplug). */
export interface ShopAvailability {
  platforms: PlatformType[];
  categorySlugs: string[];
}

export function emptyShopAvailability(): ShopAvailability {
  return { platforms: [], categorySlugs: [] };
}

export function buildShopAvailability(
  rows: Array<{
    platform?: string | null;
    supplier?: string | null;
    category?: { slug?: string | null } | null;
  }>,
): ShopAvailability {
  const platforms = new Set<PlatformType>();
  const categorySlugs = new Set<string>();

  for (const row of rows) {
    if (row.supplier === 'loggsplug') continue;

    if (row.platform) {
      platforms.add(row.platform as PlatformType);
    }

    const slug = row.category?.slug?.trim();
    if (slug) categorySlugs.add(slug);
  }

  return {
    platforms: [...platforms],
    categorySlugs: [...categorySlugs],
  };
}
