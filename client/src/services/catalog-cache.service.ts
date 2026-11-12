import { supabase } from '@/lib/supabase';
import type { Category, PaginatedResponse, Product, ProductFilters } from '@/types';

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

export const catalogCacheService = {
  /** Single request for homepage categories + featured products. */
  async getHome(limit = 6): Promise<{ categories: Category[]; products: Product[] } | null> {
    const payload = await invokePublicCatalog<{
      categories?: Category[];
      products?: Product[];
    }>({ action: 'home', limit });
    if (!Array.isArray(payload?.categories) || !Array.isArray(payload?.products)) return null;
    return { categories: payload.categories, products: payload.products };
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
