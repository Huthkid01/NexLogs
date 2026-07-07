import { supabase } from '@/lib/supabase';
import { buildAdminAnalyticsSnapshot, EMPTY_ADMIN_ANALYTICS } from '@/lib/admin-analytics';
import type { Notification, Category, Faq, Testimonial, Profile, AdminStats, AdminAnalyticsSnapshot, SupportTicket, ActivityLog, Coupon, AdminWalletTransaction, AdminWalletDepositRecord } from '@/types';

function isKoraWalletDeposit(tx: Pick<AdminWalletDepositRecord, 'kind' | 'payment_method' | 'metadata'>) {
  const meta = tx.metadata ?? {};

  if (meta.provider === 'flutterwave' || tx.payment_method === 'flutterwave' || meta.flutterwave_tx_id) {
    return false;
  }

  if (meta.provider === 'kora' || tx.payment_method.startsWith('kora')) {
    return true;
  }

  const txRef = meta.tx_ref ? String(meta.tx_ref) : '';
  if (txRef.startsWith('NEX-')) return true;

  if (meta.kora_reference) return true;

  const reason = meta.reason ? String(meta.reason).toLowerCase() : '';
  const note = meta.note ? String(meta.note).toLowerCase() : '';

  // Recovered Kora payment — admin credited after Kora succeeded but wallet was not updated
  if (txRef.toUpperCase().includes('KORA') || reason.includes('kora') || note.includes('kora')) {
    return true;
  }

  return false;
}

export function isRecoveredKoraDeposit(tx: Pick<AdminWalletDepositRecord, 'kind' | 'payment_method' | 'metadata'>) {
  const meta = tx.metadata ?? {};
  const isDirectKora = meta.provider === 'kora' || tx.payment_method.startsWith('kora');
  if (isDirectKora && tx.kind === 'deposit') return false;

  return (
    tx.kind === 'adjustment' ||
    tx.payment_method === 'admin' ||
    meta.source === 'admin_manual_credit'
  ) && isKoraWalletDeposit(tx);
}

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
    const [usersRes, ordersRes, productsRes, stockOutProductsRes, recentOrdersRes, ticketsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount'),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase
        .from('products')
        .select('id, title, slug, stock, is_active, updated_at')
        .eq('is_active', true)
        .lte('stock', 0)
        .order('updated_at', { ascending: false })
        .limit(8),
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
      stockOutProducts: (stockOutProductsRes.data || []) as AdminStats['stockOutProducts'],
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
    const rpcRecoverable = rpcMissing || rpcMessage.includes('WHERE clause');

    if (!rpcRecoverable && error) {
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

  async getUsersWithWallets(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, wallet:wallets(balance)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data || []) as Array<Profile & { wallet?: { balance: number } | { balance: number }[] | null }>).map(
      (row) => {
        const wallet = Array.isArray(row.wallet) ? row.wallet[0] : row.wallet;
        return {
          ...row,
          wallet_balance: wallet?.balance != null ? Number(wallet.balance) : 0,
        };
      },
    );
  },

  async getUserWalletTransactions(userId: string, limit = 15): Promise<AdminWalletTransaction[]> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('id, ref, kind, payment_method, amount, currency, status, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id as string,
      ref: row.ref as string,
      kind: row.kind as string,
      payment_method: row.payment_method as string,
      amount: Number(row.amount || 0),
      currency: row.currency as string,
      status: row.status as AdminWalletTransaction['status'],
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      created_at: row.created_at as string,
    }));
  },

  async getWalletFundTransactions(limit = 200): Promise<AdminWalletDepositRecord[]> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        id,
        user_id,
        ref,
        kind,
        payment_method,
        amount,
        currency,
        status,
        metadata,
        created_at,
        profile:profiles(email, full_name, role)
      `)
      .in('kind', ['deposit', 'adjustment'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || [])
      .map((row) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        if (profile?.role === 'admin') return null;

        const record = {
          id: row.id as string,
          user_id: row.user_id as string,
          ref: row.ref as string,
          kind: row.kind as string,
          payment_method: row.payment_method as string,
          amount: Number(row.amount || 0),
          currency: row.currency as string,
          status: row.status as AdminWalletTransaction['status'],
          metadata: (row.metadata as Record<string, unknown> | null) ?? null,
          created_at: row.created_at as string,
          user_email: (profile?.email as string) ?? 'Unknown',
          user_name: (profile?.full_name as string) ?? 'Unknown',
        } satisfies AdminWalletDepositRecord;

        return isKoraWalletDeposit(record) ? record : null;
      })
      .filter((row): row is AdminWalletDepositRecord => row !== null);
  },

  async creditUserWallet(input: {
    userId: string;
    amountUsd: number;
    reason: string;
    externalRef?: string;
  }) {
    const { data, error } = await supabase.rpc('admin_credit_wallet', {
      p_user_id: input.userId,
      p_amount_usd: input.amountUsd,
      p_reason: input.reason,
      p_external_ref: input.externalRef ?? null,
    });

    if (error) {
      if (error.message.includes('admin_credit_wallet') && error.message.includes('Could not find')) {
        throw new Error('Run migration 051_admin_wallet_credit.sql in Supabase SQL Editor first.');
      }
      throw new Error(error.message);
    }

    return data as string;
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
