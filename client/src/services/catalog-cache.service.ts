import { supabase } from '@/lib/supabase';
import {
  buildShopAvailability,
  emptyShopAvailability,
  type ShopAvailability,
} from '@/lib/shop-availability';
import type { Category, PaginatedResponse, Product, ProductFilters } from '@/types';

const PUBLIC_PRODUCT_COLUMNS =
  'id, title, slug, description, platform, price, stock, followers, following, account_age, country, niche, verified, featured, category_id, is_active, created_at, updated_at, sort_order, preview_url, login_instructions, supplier, supplier_product_id';

const PUBLIC_PRODUCT_SELECT =
  `${PUBLIC_PRODUCT_COLUMNS}, category:categories(id, name, slug, image_url, is_active, sort_order), product_images(image_url, sort_order)`;

const CATEGORY_SELECT =
  'id, name, slug, image_url, is_active, sort_order, created_at, updated_at';

export type HomeCatalogPayload = {
  categories: Category[];
  products: Product[];
  shopAvailability: ShopAvailability;
};

async function invokePublicCatalog<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('public-catalog', { body });
    if (error) return null;
    if (data?.error) return null;
    return data as T;
  } catch {
    return null;
  }
}

async function fetchShopAvailabilityFromRest(): Promise<ShopAvailability> {
  const { data, error } = await supabase
    .from('products')
    .select('platform, supplier, category:categories(slug)')
    .eq('is_active', true)
    .gt('stock', 0)
    .not('slug', 'like', '%-rdp-%');

  if (error || !data) return emptyShopAvailability();
  return buildShopAvailability(data as Array<{
    platform?: string | null;
    supplier?: string | null;
    category?: { slug?: string | null } | null;
  }>);
}

/** Direct Supabase reads — used only when the edge catalog is unavailable. */
async function fetchHomeFromRest(limit: number): Promise<HomeCatalogPayload | null> {
  try {
    const [categoriesRes, featuredRes, shopAvailability] = await Promise.all([
      supabase
        .from('categories')
        .select(CATEGORY_SELECT)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('products')
        .select(PUBLIC_PRODUCT_SELECT)
        .eq('is_active', true)
        .gt('stock', 0)
        .eq('featured', true)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit),
      fetchShopAvailabilityFromRest(),
    ]);

    if (categoriesRes.error || featuredRes.error) return null;

    return {
      categories: (categoriesRes.data || []) as Category[],
      products: (featuredRes.data || []) as unknown as Product[],
      shopAvailability,
    };
  } catch {
    return null;
  }
}

export const catalogCacheService = {
  /** Single request for homepage categories + featured products. */
  async getHome(limit = 6): Promise<HomeCatalogPayload | null> {
    const payload = await invokePublicCatalog<{
      categories?: Category[];
      products?: Product[];
      shopAvailability?: ShopAvailability;
    }>({ action: 'home', limit });
    if (Array.isArray(payload?.categories) && Array.isArray(payload?.products)) {
      const shopAvailability = payload.shopAvailability
        ?? await fetchShopAvailabilityFromRest();
      return {
        categories: payload.categories,
        products: payload.products,
        shopAvailability,
      };
    }
    // Edge miss/fail → one REST round-trip (do NOT call public-catalog again).
    return fetchHomeFromRest(limit);
  },

  async getCategories(): Promise<Category[] | null> {
    const payload = await invokePublicCatalog<{ categories?: Category[] }>({ action: 'categories' });
    return Array.isArray(payload?.categories) ? payload.categories : null;
  },

  async getFeatured(limit = 6): Promise<Product[] | null> {
    const payload = await invokePublicCatalog<{ products?: Product[] }>({
      action: 'featured',
      limit,
    });
    return Array.isArray(payload?.products) ? payload.products : null;
  },

  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product> | null> {
    const payload = await invokePublicCatalog<PaginatedResponse<Product> & { success?: boolean }>({
      action: 'products',
      search: filters.search,
      platform: filters.platform,
      category_id: filters.categoryId,
      sort: filters.sort,
      page: filters.page,
      page_limit: filters.limit,
    });

    if (!payload || !Array.isArray(payload.data)) return null;
    return {
      data: payload.data,
      total: payload.total ?? 0,
      page: payload.page ?? filters.page ?? 1,
      limit: payload.limit ?? filters.limit ?? 10,
      totalPages: payload.totalPages ?? 0,
    };
  },

  async invalidatePublicCatalog(): Promise<void> {
    await invokePublicCatalog({ action: 'invalidate' });
  },

  /** After purchase: clear Redis listing caches so stock changes show immediately. */
  async invalidateListingsAfterPurchase(): Promise<void> {
    await invokePublicCatalog({ action: 'invalidate-listings' });
  },
};
