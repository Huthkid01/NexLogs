import { supabase } from '@/lib/supabase';
import { isMockMode } from '@/lib/mock-mode';
import { mockAdminService } from '@/mocks/mock-admin';
import { mockProductService } from '@/mocks/mock-products';
import type { Product, ProductFilters, PaginatedResponse } from '@/types';

export const productService = {
  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    if (isMockMode()) return mockProductService.getProducts(filters);
    const { search, platform, country, verified, minPrice, maxPrice, categoryId, sort = 'newest', page = 1, limit = 12 } = filters;

    let query = supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)', { count: 'exact' })
      .eq('is_active', true);

    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,niche.ilike.%${search}%`);
    if (platform) query = query.eq('platform', platform);
    if (country) query = query.ilike('country', `%${country}%`);
    if (verified !== undefined) query = query.eq('verified', verified);
    if (minPrice !== undefined) query = query.gte('price', minPrice);
    if (maxPrice !== undefined) query = query.lte('price', maxPrice);
    if (categoryId) query = query.eq('category_id', categoryId);

    switch (sort) {
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      case 'price_asc': query = query.order('price', { ascending: true }); break;
      case 'price_desc': query = query.order('price', { ascending: false }); break;
      case 'popular': query = query.order('followers', { ascending: false, nullsFirst: false }); break;
      default: query = query.order('created_at', { ascending: false });
    }

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
    if (isMockMode()) return mockProductService.getFeatured(limit);
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .eq('is_active', true)
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as Product[];
  },

  async getBySlug(slug: string): Promise<Product | null> {
    if (isMockMode()) return mockProductService.getBySlug(slug);
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*), reviews(*, profile:profiles(full_name, avatar_url))')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    if (error) return null;
    return data as Product;
  },

  async getRelated(productId: string, categoryId: string, limit = 4): Promise<Product[]> {
    if (isMockMode()) return mockProductService.getRelated(productId, categoryId, limit);
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .neq('id', productId)
      .limit(limit);
    if (error) throw error;
    return (data || []) as Product[];
  },

  async getAllAdmin(): Promise<Product[]> {
    if (isMockMode()) return mockAdminService.getProducts();
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Product[];
  },

  async create(product: Partial<Product>) {
    if (isMockMode()) return mockAdminService.createProduct(product);
    const { data, error } = await supabase.from('products').insert(product as never).select().single();
    if (error) throw error;
    return data as Product;
  },

  async update(id: string, updates: Partial<Product>) {
    if (isMockMode()) return mockAdminService.updateProduct(id, updates);
    const { data, error } = await supabase.from('products').update(updates as never).eq('id', id).select().single();
    if (error) throw error;
    return data as Product;
  },

  async delete(id: string) {
    if (isMockMode()) return mockAdminService.deleteProduct(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },
};
