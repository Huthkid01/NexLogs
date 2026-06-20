import type { Product, ProductFilters, PaginatedResponse } from '@/types';
import { MOCK_PRODUCTS } from '@/mocks/demo-data';

function filterProducts(filters: ProductFilters): Product[] {
  const { search, platform, categoryId, sort = 'newest' } = filters;
  let results = [...MOCK_PRODUCTS];

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.niche?.toLowerCase().includes(q) ?? false)
    );
  }

  if (platform) results = results.filter((p) => p.platform === platform);
  if (categoryId) results = results.filter((p) => p.category_id === categoryId);

  switch (sort) {
    case 'oldest':
      results.sort((a, b) => b.sort_order - a.sort_order || a.id.localeCompare(b.id));
      break;
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'popular':
      results.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));
      break;
    default:
      results.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  }

  return results;
}

export const mockProductService = {
  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 12 } = filters;
    const filtered = filterProducts(filters);
    const total = filtered.length;
    const from = (page - 1) * limit;
    const data = filtered.slice(from, from + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async getFeatured(limit = 6): Promise<Product[]> {
    return MOCK_PRODUCTS.filter((p) => p.featured).slice(0, limit);
  },

  async getBySlug(slug: string): Promise<Product | null> {
    return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  },

  async getRelated(productId: string, categoryId: string, limit = 4): Promise<Product[]> {
    return MOCK_PRODUCTS.filter((p) => p.category_id === categoryId && p.id !== productId).slice(0, limit);
  },
};
