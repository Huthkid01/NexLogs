import { supabase } from '@/lib/supabase';
import type { Wishlist, Notification, Category, BlogPost, Faq, Testimonial, Profile, AdminStats, AdminAnalyticsSnapshot, SupportTicket, ActivityLog, Coupon } from '@/types';
import { buildAdminAnalyticsSnapshot, EMPTY_ADMIN_ANALYTICS } from '@/lib/admin-analytics';

export const wishlistService = {
  async getWishlist(userId: string): Promise<Wishlist[]> {
    const { data, error } = await supabase
      .from('wishlists')
      .select('*, product:products(*, product_images(*), category:categories(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Wishlist[];
  },

  async add(userId: string, productId: string) {
    const { error } = await supabase.from('wishlists').insert({ user_id: userId, product_id: productId } as never);
    if (error) throw error;
  },

  async remove(userId: string, productId: string) {
    const { error } = await supabase.from('wishlists').delete().eq('user_id', userId).eq('product_id', productId);
    if (error) throw error;
  },

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const { data } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();
    return !!data;
  },
};

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as Notification[];
  },

  async markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ read: true } as never).eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase.from('notifications').update({ read: true } as never).eq('user_id', userId);
    if (error) throw error;
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) return 0;
    return count || 0;
  },
};

export const activityLogService = {
  async create(log: Omit<ActivityLog, 'id' | 'created_at'> & Partial<Pick<ActivityLog, 'id' | 'created_at'>>) {
    const { error } = await supabase.from('activity_logs').insert({
      user_id: log.user_id,
      action: log.action,
      entity: log.entity,
      entity_id: log.entity_id,
      metadata: log.metadata,
    } as never);
    if (error) throw error;
  },

  async getAllAdmin(): Promise<ActivityLog[]> {
    const { data: adminRows } = await supabase.from('profiles').select('id').eq('role', 'admin');
    const adminIds = (adminRows ?? []).map((row) => row.id);

    let query = supabase
      .from('activity_logs')
      .select('*, profile:profiles(full_name, email, role)')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (adminIds.length > 0) {
      query = query.not('user_id', 'in', `(${adminIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as ActivityLog[]).filter(
      (log) => log.profile?.role !== 'admin',
    );
  },
};

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return (data || []) as Category[];
  },

  async getAllAdmin(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) throw error;
    return (data || []) as Category[];
  },

  async create(category: Partial<Category>) {
    const { data, error } = await supabase.from('categories').insert(category as never).select().single();
    if (error) throw error;
    return data as Category;
  },

  async update(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase.from('categories').update(updates as never).eq('id', id).select().single();
    if (error) throw error;
    return data as Category;
  },

  async delete(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },
};

export const blogService = {
  async getPublished(): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, author:profiles(full_name, avatar_url)')
      .eq('published', true)
      .order('published_at', { ascending: false });
    if (error) throw error;
    return (data || []) as BlogPost[];
  },

  async getBySlug(slug: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, author:profiles(full_name, avatar_url)')
      .eq('slug', slug)
      .eq('published', true)
      .single();
    if (error) return null;
    return data as BlogPost;
  },

  async getAllAdmin(): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, author:profiles(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as BlogPost[];
  },

  async create(post: Partial<BlogPost>) {
    const { data, error } = await supabase.from('blog_posts').insert(post as never).select().single();
    if (error) throw error;
    return data as BlogPost;
  },

  async update(id: string, updates: Partial<BlogPost>) {
    const { data, error } = await supabase.from('blog_posts').update(updates as never).eq('id', id).select().single();
    if (error) throw error;
    return data as BlogPost;
  },

  async delete(id: string) {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
  },
};

export const contentService = {
  async getFaqs(): Promise<Faq[]> {
    const { data, error } = await supabase.from('faqs').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return (data || []) as Faq[];
  },

  async getTestimonials(): Promise<Testimonial[]> {
    const { data, error } = await supabase.from('testimonials').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return (data || []) as Testimonial[];
  },
};

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const [usersRes, ordersRes, productsRes, recentOrdersRes, ticketsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount'),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('*, order_items(*, product:products(title)), profile:profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']),
    ]);

    const orders = (ordersRes.data || []) as { total_amount: number }[];
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    return {
      totalUsers: usersRes.count || 0,
      totalOrders: orders.length,
      totalRevenue,
      totalProducts: productsRes.count || 0,
      openTickets: ticketsRes.count || 0,
      recentOrders: (recentOrdersRes.data || []) as AdminStats['recentOrders'],
    };
  },

  async getAnalytics(): Promise<AdminAnalyticsSnapshot> {
    const [ordersRes, orderItemsRes] = await Promise.all([
      supabase.from('orders').select('total_amount, status, payment_status, created_at'),
      supabase
        .from('order_items')
        .select('quantity, price, product:products(platform, country, slug, title)'),
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (orderItemsRes.error) throw orderItemsRes.error;

    const orders = (ordersRes.data || []) as Array<{
      total_amount: number;
      status: AdminStats['recentOrders'][number]['status'];
      payment_status: string;
      created_at: string;
    }>;
    const orderItems = (orderItemsRes.data || []).map((row) => {
      const item = row as {
        quantity: number;
        price: number;
        product: { platform: string; country: string | null; slug: string; title: string } | { platform: string; country: string | null; slug: string; title: string }[] | null;
      };
      const product = Array.isArray(item.product) ? item.product[0] ?? null : item.product;
      return {
        quantity: Number(item.quantity),
        price: Number(item.price),
        product,
      };
    });

    if (!orders.length && !orderItems.length) {
      return EMPTY_ADMIN_ANALYTICS;
    }

    return buildAdminAnalyticsSnapshot(orders, orderItems);
  },

  async clearOrderHistory(): Promise<{ deleted_orders: number }> {
    const { data, error } = await supabase.rpc('clear_order_history', {});

    if (!error) {
      const result = data as { cleared?: boolean; deleted_orders?: number } | null;
      if (result?.cleared) {
        return { deleted_orders: result.deleted_orders ?? 0 };
      }
    }

    const rpcMessage = error?.message ?? '';
    const rpcMissing =
      rpcMessage.includes('clear_order_history') &&
      (rpcMessage.includes('does not exist') || rpcMessage.includes('Could not find'));

    if (!rpcMissing && error) {
      throw new Error(error.message);
    }

    const { data: orders, error: selectError } = await supabase.from('orders').select('id');
    if (selectError) throw new Error(selectError.message);

    const orderIds = (orders ?? []).map((order) => order.id);
    if (!orderIds.length) {
      return { deleted_orders: 0 };
    }

    const { error: deleteError } = await supabase.from('orders').delete().in('id', orderIds);
    if (deleteError) {
      throw new Error(
        deleteError.message.includes('policy')
          ? 'Clear orders is not set up yet. Run migration 044_fix_clear_order_history.sql in Supabase SQL Editor.'
          : deleteError.message,
      );
    }

    return { deleted_orders: orderIds.length };
  },

  async getUsers(): Promise<Profile[]> {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Profile[];
  },

  async updateUser(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase.from('profiles').update(updates as never).eq('id', id).select().single();
    if (error) throw error;
    return data as Profile;
  },

  async deleteUser(id: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },
};

export const supportTicketService = {
  async create(ticket: Partial<SupportTicket>) {
    const { data, error } = await supabase.from('support_tickets').insert(ticket as never).select().single();
    if (error) throw error;
    return data as SupportTicket;
  },

  async getAllAdmin() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SupportTicket[];
  },

  async update(id: string, updates: Partial<SupportTicket>) {
    const { data, error } = await supabase.from('support_tickets').update(updates as never).eq('id', id).select().single();
    if (error) throw error;
    return data as SupportTicket;
  },
};

export const couponService = {
  async getAllAdmin(): Promise<Coupon[]> {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Coupon[];
  },
};

export const storageService = {
  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};
