import { supabase } from '@/lib/supabase';
import { isValidSmsVerificationCode } from '@/lib/sms-verification-code';
import type { PaginatedResponse, ProfileStats, ReferralStats, Transaction } from '@/types';

function makeRef(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}

const HIDDEN_WALLET_SOURCES = new Set([
  'sms_number_refund',
  'duplicate_sms_refund_correction',
]);

function collectHiddenSmsWalletTxIds(
  orders: Array<{
    wallet_transaction_id: string | null;
    verification_code: string | null;
    metadata: unknown;
  }>,
) {
  const hidden = new Set<string>();

  for (const order of orders) {
    const meta = order.metadata && typeof order.metadata === 'object'
      ? order.metadata as Record<string, unknown>
      : {};

    const refundTxId = meta.refund_wallet_transaction_id;
    if (typeof refundTxId === 'string' && refundTxId.trim()) {
      hidden.add(refundTxId.trim());
    }

    // Only keep the original SMS charge when a real verification code was received.
    if (!isValidSmsVerificationCode(order.verification_code)) {
      if (order.wallet_transaction_id) {
        hidden.add(String(order.wallet_transaction_id));
      }
      const resendTxId = meta.last_resend_wallet_transaction_id;
      if (typeof resendTxId === 'string' && resendTxId.trim()) {
        hidden.add(resendTxId.trim());
      }
    }
  }

  return hidden;
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

    // Display-only filter: hide cancelled/no-code SMS charges + refunds.
    // Does not change wallet balances or order rows.
    const { data: smsOrders, error: smsOrdersError } = await supabase
      .from('sms_number_orders')
      .select('wallet_transaction_id, verification_code, metadata')
      .eq('user_id', userId);

    if (smsOrdersError) throw smsOrdersError;

    const hiddenTxIds = collectHiddenSmsWalletTxIds(
      (smsOrders || []) as Array<{
        wallet_transaction_id: string | null;
        verification_code: string | null;
        metadata: unknown;
      }>,
    );

    let query = supabase
      .from('wallet_transactions')
      .select('id, ref, created_at, updated_at, payment_method, amount, status, metadata', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (hiddenTxIds.size > 0) {
      query = query.not('id', 'in', `(${Array.from(hiddenTxIds).join(',')})`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;

    const mapped = (data || [])
      .filter((tx) => {
        const meta = tx.metadata && typeof tx.metadata === 'object'
          ? tx.metadata as Record<string, unknown>
          : {};
        const source = typeof meta.source === 'string' ? meta.source : '';
        return !HIDDEN_WALLET_SOURCES.has(source);
      })
      .map((tx) => ({
        id: tx.id as string,
        ref: tx.ref as string,
        created_at: tx.created_at as string,
        updated_at: tx.updated_at as string,
        payment_method: tx.payment_method as string,
        amount: Number(tx.amount || 0),
        status: tx.status as Transaction['status'],
      })) as Transaction[];

    // Prefer exact DB count when we did not need a client-side source filter on this page.
    const filteredOutOnPage = (data || []).length - mapped.length;
    const total = Math.max(0, (count || 0) - filteredOutOnPage);
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
