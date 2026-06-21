import { supabase } from '@/lib/supabase';
import type { Product, ProductFilters, PaginatedResponse } from '@/types';

async function getNextProductSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.sort_order ?? 1) - 1;
}

export const productService = {
  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    const { search, platform, country, verified, minPrice, maxPrice, categoryId, sort = 'newest', page = 1, limit = 12 } = filters;

    let query = supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)', { count: 'exact' })
      .eq('is_active', true)
      .not('slug', 'like', '%-rdp-%');

    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,niche.ilike.%${search}%`);
    if (platform) query = query.eq('platform', platform);
    if (country) query = query.ilike('country', `%${country}%`);
    if (verified !== undefined) query = query.eq('verified', verified);
    if (minPrice !== undefined) query = query.gte('price', minPrice);
    if (maxPrice !== undefined) query = query.lte('price', maxPrice);
    if (categoryId) query = query.eq('category_id', categoryId);

    switch (sort) {
      case 'oldest': query = query.order('sort_order', { ascending: false }); break;
      case 'price_asc': query = query.order('price', { ascending: true }); break;
      case 'price_desc': query = query.order('price', { ascending: false }); break;
      case 'popular': query = query.order('followers', { ascending: false, nullsFirst: false }); break;
      default: query = query.order('sort_order', { ascending: true });
    }

    query = query.order('id', { ascending: true });

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data || []) as Product[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getFeatured(limit = 6): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .eq('is_active', true)
      .eq('featured', true)
      .not('slug', 'like', '%-rdp-%')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []) as Product[];
  },

  async getBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*), reviews(*, profile:profiles(full_name, avatar_url))')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    if (error) return null;
    return data as Product;
  },

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Product;
  },

  async getRelated(productId: string, categoryId: string, limit = 4): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .neq('id', productId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []) as Product[];
  },

  async getAllAdmin(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return (data || []) as Product[];
  },

  async create(product: Partial<Product>) {
    const sort_order = await getNextProductSortOrder();
    const { data, error } = await supabase.from('products').insert({ ...product, sort_order } as never).select().single();
    if (error) throw error;
    return data as Product;
  },

  async update(id: string, updates: Partial<Product>) {
    const { sort_order: _ignored, ...safeUpdates } = updates;
    const { data, error } = await supabase.from('products').update(safeUpdates as never).eq('id', id).select().single();
    if (error) throw error;
    return data as Product;
  },

  async delete(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },
};
