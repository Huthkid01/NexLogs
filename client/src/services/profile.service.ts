import { supabase } from '@/lib/supabase';
import type { PaginatedResponse, ProfileStats, ReferralStats, Transaction } from '@/types';

function makeRef(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}

export const profileService = {
  async getStats(userId: string): Promise<ProfileStats> {
    const [walletRes, ordersRes] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle(),
      supabase.from('orders').select('total_amount, payment_status').eq('user_id', userId),
    ]);

    if (walletRes.error) {
      throw walletRes.error;
    }

    const balance = walletRes.data?.balance != null ? Number(walletRes.data.balance) : 0;
    const paidOrders = (ordersRes.data || []).filter((o) => o.payment_status === 'paid');
    const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    return {
      balance,
      total_purchases: paidOrders.length,
      total_spent: totalSpent,
    };
  },

  async getTransactions(userId: string, page = 1, limit = 5): Promise<PaginatedResponse<Transaction>> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from('wallet_transactions')
      .select('id, ref, created_at, updated_at, payment_method, amount, status', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;

    const mapped = (data || []).map((tx) => ({
      id: tx.id as string,
      ref: tx.ref as string,
      created_at: tx.created_at as string,
      updated_at: tx.updated_at as string,
      payment_method: tx.payment_method as string,
      amount: Number(tx.amount || 0),
      status: tx.status as Transaction['status'],
    })) as Transaction[];

    const total = count || 0;
    return { data: mapped, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const [profileRes, referralsRes, earningsRes] = await Promise.all([
      supabase.from('profiles').select('referral_code').eq('id', userId).single(),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', userId),
      supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('kind', 'referral_bonus')
        .eq('status', 'completed'),
    ]);

    const code = (profileRes.data?.referral_code as string | null) ?? makeRef('REF');
    const totalReferrals = referralsRes.count || 0;
    const totalEarnings = (earningsRes.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return {
      code,
      total_referrals: totalReferrals,
      qualified_referrals: totalReferrals,
      total_earnings: totalEarnings,
    };
  },
};
