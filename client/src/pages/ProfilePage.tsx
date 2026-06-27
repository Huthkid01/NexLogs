import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profile.service';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { Skeleton } from '@/components/ui/skeleton';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f26522] rounded-xl px-4 py-5 text-center text-white">
      <p className="text-xs font-medium opacity-95">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [page, setPage] = useState(1);
  const { formatDisplayAmount } = useFormatDisplayPrice();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: () => profileService.getStats(user!.id),
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['profile-transactions', user?.id, page],
    queryFn: () => profileService.getTransactions(user!.id, page, 5),
    enabled: !!user,
  });

  const { data: referral, isLoading: referralLoading } = useQuery({
    queryKey: ['profile-referral', user?.id],
    queryFn: () => profileService.getReferralStats(user!.id),
    enabled: !!user,
  });

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US')
    : '';

  const copyReferralCode = async () => {
    if (!referral?.code) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      toast.success('Referral code copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-dm-bg min-h-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col items-center text-center">
          <span className="w-20 h-20 rounded-full bg-[#3b82f6] flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-white" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 break-all">{user?.email}</h1>
          {memberSince && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Member since {memberSince}</p>
          )}
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Account Balance" value={formatDisplayAmount(stats.balance)} />
            <StatCard label="Total Purchases" value={String(stats.total_purchases)} />
            <StatCard label="Total Amount Spent" value={formatDisplayAmount(stats.total_spent)} />
          </div>
        )}

        <div className="bg-white dark:bg-dm-surface rounded-xl border border-gray-200 dark:border-dm-border overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dm-border">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Transactions</h2>
          </div>

          {txLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-200">
                      <th className="px-4 sm:px-6 py-3 font-medium">Ref</th>
                      <th className="px-4 py-3 font-medium">Date Created</th>
                      <th className="px-4 py-3 font-medium">Date Updated</th>
                      <th className="px-4 py-3 font-medium">Payment Method</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 sm:px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions?.data.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 dark:border-dm-border last:border-b-0">
                        <td className="px-4 sm:px-6 py-3.5 font-medium text-gray-900 dark:text-gray-100">{tx.ref}</td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateTime(tx.updated_at)}</td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400">{tx.payment_method}</td>
                        <td className="px-4 py-3.5 text-gray-900 dark:text-gray-100 font-medium">{formatDisplayAmount(tx.amount)}</td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactions && transactions.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-dm-border">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-dm-input-border rounded-md bg-white dark:bg-dm-surface text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-dm-input"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {transactions.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= transactions.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-dm-input-border rounded-md bg-white dark:bg-dm-surface text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-dm-input"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white dark:bg-dm-surface rounded-xl border border-gray-200 dark:border-dm-border p-4 sm:p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Referral Program</h2>

          {referralLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : referral && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Referral Code:</p>
                  <p className="text-3xl sm:text-4xl font-bold text-[#f26522] tracking-wide">{referral.code}</p>
                </div>
                <button
                  type="button"
                  onClick={copyReferralCode}
                  className="sm:ml-auto px-4 py-2 text-sm border border-gray-300 dark:border-dm-input-border rounded-md bg-white dark:bg-dm-surface text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dm-input shrink-0"
                >
                  Copy
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Referrals" value={String(referral.total_referrals)} />
                <div className="bg-[#f26522] rounded-xl px-4 py-5 text-center text-white">
                  <p className="text-xs font-medium opacity-95 flex items-center justify-center gap-1">
                    Qualified Referrals
                    <Info className="h-3.5 w-3.5" aria-hidden />
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold mt-2">{referral.qualified_referrals}</p>
                </div>
                <StatCard label="Total Earnings" value={formatDisplayAmount(referral.total_earnings)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
