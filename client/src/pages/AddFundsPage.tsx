import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { profileService } from '@/services/profile.service';
import { isKoraConfigured, isKoraTestMode } from '@/lib/kora-config';
import { hasSupabaseConfig } from '@/lib/mock-mode';
import {
  completeKoraRedirect,
  resumePendingDeposit,
  startKoraDeposit,
  finalizeDepositSuccess,
} from '@/services/payment.service';

const inputClassName =
  'w-full h-10 rounded-md border border-gray-300 dark:border-dm-input-border bg-white dark:bg-dm-input px-3 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-dm-input-border';

export default function AddFundsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<'checking' | 'verifying' | null>(null);
  const [verifyingRedirect, setVerifyingRedirect] = useState(false);
  const redirectHandled = useRef(false);
  const pendingHandled = useRef(false);
  const { data: walletStats } = useWalletBalance(user?.id);

  useEffect(() => {
    if (!user?.id || pendingHandled.current || verifyingRedirect) return;

    pendingHandled.current = true;
    void (async () => {
      try {
        const recovered = await resumePendingDeposit();
        if (!recovered) return;

        setVerifyingRedirect(true);
        const stats = await profileService.getStats(user.id);
        await finalizeDepositSuccess(user.id, stats.balance, async () => {
          await queryClient.refetchQueries({ queryKey: ['wallet-balance', user.id] });
          await queryClient.refetchQueries({ queryKey: ['profile-stats', user.id] });
        });
        toast.success('Payment verified. Funds added to your wallet.');
      } catch {
        // No pending deposit or verification still in progress elsewhere.
      } finally {
        setVerifyingRedirect(false);
      }
    })();
  }, [user?.id, queryClient, verifyingRedirect]);

  useEffect(() => {
    if (!user?.id || redirectHandled.current || verifyingRedirect) return;
    if (!searchParams.get('reference')) return;

    redirectHandled.current = true;
    setVerifyingRedirect(true);
    void (async () => {
      try {
        const completed = await completeKoraRedirect(searchParams);
        if (!completed) return;

        await finalizeDepositSuccess(user.id, walletStats?.balance ?? 0, async () => {
          await queryClient.refetchQueries({ queryKey: ['wallet-balance', user.id] });
          await queryClient.refetchQueries({ queryKey: ['profile-stats', user.id] });
        });
        toast.success('Payment successful. Funds added to your wallet.');
        setSearchParams({}, { replace: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Payment verification failed';
        toast.error(message);
        setSearchParams({}, { replace: true });
      } finally {
        setVerifyingRedirect(false);
      }
    })();
  }, [user?.id, searchParams, setSearchParams, queryClient, verifyingRedirect, walletStats?.balance]);

  const depositPreview = useMemo(() => {
    const value = parseFloat(amount);
    if (!amount || Number.isNaN(value) || value <= 0) return null;
    return `₦${value.toLocaleString('en-NG')} will be added to your wallet`;
  }, [amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login first');
      return;
    }

    const value = parseFloat(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!isKoraConfigured()) {
      toast.error('Kora is not configured. Add VITE_KORA_PUBLIC_KEY to your environment.');
      return;
    }

    setSubmitting(true);
    setPaymentNotice(null);
    try {
      if (!hasSupabaseConfig()) {
        toast.error('Wallet deposits require Supabase. Add your Supabase keys and redeploy.');
        return;
      }

      if (!user.email) {
        toast.error('Your account email is required for payment');
        return;
      }

      const balanceBefore = walletStats?.balance ?? 0;
      const depositParams = {
        userId: user.id,
        email: user.email,
        name: profile?.full_name,
        amount: value,
        currency: 'NGN' as const,
        walletAmount: value,
        paymentMethod: 'kora_card',
        onPaymentModalOpened: () => setSubmitting(false),
        onPaymentConfirmed: () => setPaymentNotice('verifying'),
        onPaymentChecking: () => setPaymentNotice('checking'),
      };

      const result = await startKoraDeposit(depositParams);

      if (result.status === 'pending') {
        toast.info(
          'Payment is still being confirmed. Stay on this page or refresh — your wallet will update automatically.',
        );
        return;
      }

      await finalizeDepositSuccess(user.id, balanceBefore, async () => {
        await queryClient.refetchQueries({ queryKey: ['wallet-balance', user.id] });
        await queryClient.refetchQueries({ queryKey: ['profile-stats', user.id] });
      });
      toast.success('Payment successful. Funds added to your wallet.');
      setAmount('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      if (message !== 'Payment cancelled') {
        toast.error(message);
      }
    } finally {
      setPaymentNotice(null);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-dm-bg min-h-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl bg-white dark:bg-dm-surface rounded-xl border border-gray-200 dark:border-dm-border shadow-sm p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Add Funds</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Enter amount in Naira — pay with Kora (card or bank transfer)
          </p>

          {(verifyingRedirect || paymentNotice) && (
            <div className="flex items-center gap-2 rounded-lg bg-[#fff3eb] border border-[#fde0cc] px-3 py-2.5 mb-4">
              <Info className="h-4 w-4 text-[#f26522] shrink-0" />
              <p className="text-sm text-gray-800">
                {verifyingRedirect
                  ? 'Verifying your payment…'
                  : paymentNotice === 'verifying'
                    ? 'Payment received. Verifying and adding funds to your wallet…'
                    : 'Checking payment status…'}
              </p>
            </div>
          )}

          {isKoraTestMode() && import.meta.env.DEV && (
            <div className="flex items-start gap-2 rounded-lg bg-[#fff3eb] border border-[#fde0cc] px-3 py-2.5 mb-4">
              <Info className="h-4 w-4 text-[#f26522] shrink-0 mt-0.5" />
              <p className="text-sm text-gray-800">
                Test mode is active. Use sandbox cards and bank accounts for test payments.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-[#fff8e6] dark:bg-[#f26522] border border-[#f5e6b8] dark:border-[#f26522] px-3 py-2.5 mb-6">
            <Info className="h-4 w-4 text-amber-700 dark:text-white shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 dark:text-white">
              Payments are processed securely by Kora. We do not store your card details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Amount (NGN)
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="1"
                placeholder="Enter amount in Naira"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClassName} placeholder:text-gray-400`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                {depositPreview ?? 'Enter an amount to see wallet credit'}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !!paymentNotice}
              className="w-full max-w-md btn-orange py-2.5 text-sm disabled:opacity-60"
            >
              {paymentNotice === 'verifying'
                ? 'Verifying payment…'
                : paymentNotice === 'checking'
                  ? 'Checking payment…'
                  : submitting
                    ? 'Opening payment…'
                    : 'Proceed to Payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
