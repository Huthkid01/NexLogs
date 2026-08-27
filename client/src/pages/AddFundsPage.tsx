import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { isKoraTestMode } from '@/lib/kora-config';
import { hasSupabaseConfig } from '@/lib/mock-mode';
import { getFriendlyErrorMessage } from '@/lib/purchase-errors';
import {
  getDepositChargeNgn,
  getDepositFeeNgn,
  MIN_WALLET_DEPOSIT_NGN,
} from '@/lib/wallet-deposit-fees';
import {
  completeKoraRedirect,
  finalizeDepositSuccess,
  getPendingWalletPaymentIntents,
  recoverPendingDeposits,
  startKoraDeposit,
  verifyWalletDepositReference,
  type PendingWalletPaymentIntent,
} from '@/services/payment.service';
import { profileService } from '@/services';

const inputClassName =
  'w-full h-10 rounded-md border border-gray-300 dark:border-dm-input-border bg-white dark:bg-dm-input px-3 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-dm-input-border';

export default function AddFundsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingRedirect, setVerifyingRedirect] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingIntents, setPendingIntents] = useState<PendingWalletPaymentIntent[]>([]);
  const [recoveringDeposit, setRecoveringDeposit] = useState(false);
  const redirectHandled = useRef(false);
  const recoveryHandled = useRef(false);
  const { data: walletStats } = useWalletBalance(user?.id);

  const refreshPendingIntents = async (userId: string) => {
    const intents = await getPendingWalletPaymentIntents(userId);
    setPendingIntents(intents);
    return intents;
  };

  const handleDepositCredited = useCallback(async () => {
    if (!user?.id) return;
    const previousBalance = walletStats?.balance ?? 0;
    await finalizeDepositSuccess(user.id, previousBalance, async () => {
      await queryClient.refetchQueries({ queryKey: ['wallet-balance', user.id] });
      await queryClient.refetchQueries({ queryKey: ['profile-stats', user.id] });
    });
    await refreshPendingIntents(user.id);

    const latest = await profileService.getStats(user.id).catch(() => null);
    if (latest && latest.balance > previousBalance) {
      toast.success('Payment successful. Funds added to your wallet.');
      return;
    }

    toast.message(
      'Payment received. If your balance has not updated yet, tap Verify payment below or refresh this page.',
    );
  }, [queryClient, user?.id, walletStats?.balance]);

  useEffect(() => {
    if (!user?.id || redirectHandled.current || verifyingRedirect) return;
    if (!searchParams.get('reference')) return;

    redirectHandled.current = true;
    void (async () => {
      queueMicrotask(() => setVerifyingRedirect(true));
      try {
        const completed = await completeKoraRedirect(searchParams, user.id);
        if (!completed) return;

        await handleDepositCredited();
        setSearchParams({}, { replace: true });
      } catch (err: unknown) {
        toast.error(getFriendlyErrorMessage(err, 'We could not verify your payment. If money left your account, contact support.'));
        setSearchParams({}, { replace: true });
      } finally {
        setVerifyingRedirect(false);
      }
    })();
  }, [user?.id, searchParams, setSearchParams, queryClient, verifyingRedirect, handleDepositCredited]);

  useEffect(() => {
    if (!user?.id || recoveryHandled.current || verifyingRedirect) return;
    if (searchParams.get('reference')) return;

    recoveryHandled.current = true;
    void (async () => {
      try {
        const { credited } = await recoverPendingDeposits(user.id);
        if (credited.length > 0) {
          await handleDepositCredited();
          return;
        }
        await refreshPendingIntents(user.id);
      } catch {
        toast.message('Could not check pending payments. If you already paid, tap Verify payment below.');
        await refreshPendingIntents(user.id).catch(() => undefined);
      }
    })();
  }, [user?.id, searchParams, verifyingRedirect, handleDepositCredited]);

  const handleVerifyPendingIntent = async (intent: PendingWalletPaymentIntent) => {
    if (!user?.id) return;

    setRecoveringDeposit(true);
    try {
      await verifyWalletDepositReference(intent.reference, user.id, intent.payment_method);
      await handleDepositCredited();
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'We could not verify your payment. If money left your account, contact support.'));
      await refreshPendingIntents(user.id);
    } finally {
      setRecoveringDeposit(false);
    }
  };

  const minimumAmountLabel = useMemo(
    () => `NGN ${MIN_WALLET_DEPOSIT_NGN.toLocaleString('en-NG')}`,
    [],
  );

  const depositPreview = useMemo(() => {
    const value = parseFloat(amount);
    if (!amount || Number.isNaN(value) || value <= 0) return null;
    if (value < MIN_WALLET_DEPOSIT_NGN) {
      return `Minimum wallet credit is ₦${MIN_WALLET_DEPOSIT_NGN.toLocaleString('en-NG')}`;
    }
    const fee = getDepositFeeNgn(value);
    const total = getDepositChargeNgn(value);
    return {
      walletCredit: value,
      fee,
      total,
    };
  }, [amount]);

  const totalPaymentPreview = useMemo(() => {
    if (!depositPreview || typeof depositPreview === 'string') return null;
    return depositPreview.total;
  }, [depositPreview]);

  const openPaymentConfirm = (e: React.FormEvent) => {
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

    if (value < MIN_WALLET_DEPOSIT_NGN) {
      toast.error(`Minimum deposit is ₦${MIN_WALLET_DEPOSIT_NGN.toLocaleString('en-NG')}`);
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }

    const value = parseFloat(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (value < MIN_WALLET_DEPOSIT_NGN) {
      toast.error(`Minimum deposit is ₦${MIN_WALLET_DEPOSIT_NGN.toLocaleString('en-NG')}`);
      return;
    }

    const totalToPay = getDepositChargeNgn(value);

    setSubmitting(true);
    try {
      if (!hasSupabaseConfig()) {
        toast.error('Wallet deposits are temporarily unavailable. Please try again later or contact support.');
        return;
      }

      if (!user.email) {
        toast.error('Your account email is required for payment');
        return;
      }

      const depositParams = {
        userId: user.id,
        email: user.email,
        name: profile?.full_name,
        amount: totalToPay,
        currency: 'NGN' as const,
        walletAmount: value,
        paymentMethod: 'kora_card',
      };

      setConfirmOpen(false);
      await startKoraDeposit(depositParams);
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      if (message !== 'Payment cancelled') {
        toast.error(getFriendlyErrorMessage(err, 'We could not start your payment. Please try again or contact support.'));
      }
    } finally {
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

          {verifyingRedirect && (
            <div className="flex items-center gap-2 rounded-lg bg-[#fff3eb] border border-[#fde0cc] px-3 py-2.5 mb-4">
              <Info className="h-4 w-4 text-[#f26522] shrink-0" />
              <p className="text-sm text-gray-800">
                Verifying your payment...
              </p>
            </div>
          )}

          {pendingIntents.length > 0 && !verifyingRedirect && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 px-3 py-3 mb-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Pending wallet top-up
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    If you already paid on Kora, tap verify below to credit your wallet.
                  </p>
                </div>
              </div>
              {pendingIntents.map((intent) => (
                <div
                  key={intent.reference}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-amber-200/80 dark:border-amber-900/50 bg-white/70 dark:bg-dm-surface/80 px-3 py-2.5"
                >
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <p className="font-medium">
                      ₦{intent.expected_amount_ngn.toLocaleString('en-NG')} wallet credit
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Pay total: ₦{intent.charge_amount.toLocaleString('en-NG')} · Ref {intent.reference}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={recoveringDeposit || submitting || verifyingRedirect}
                    onClick={() => void handleVerifyPendingIntent(intent)}
                    className="shrink-0 rounded-md bg-[#f26522] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d94e0f] disabled:opacity-60"
                  >
                    {recoveringDeposit ? 'Verifying...' : 'Verify payment'}
                  </button>
                </div>
              ))}
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

          <form onSubmit={openPaymentConfirm} className="space-y-5 max-w-md">
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
                Minimum amount: {minimumAmountLabel}
              </p>
              {depositPreview == null ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter an amount to see wallet credit, fee, and total to pay
                </p>
              ) : typeof depositPreview === 'string' ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{depositPreview}</p>
              ) : (
                <div className="mt-2 rounded-md border border-gray-200 dark:border-dm-border bg-gray-50 dark:bg-dm-product-row px-3 py-2 space-y-1 text-xs text-gray-700 dark:text-gray-200">
                  <p>Wallet credit: <span className="font-semibold">₦{depositPreview.walletCredit.toLocaleString('en-NG')}</span></p>
                  <p>Processing fee: <span className="font-semibold">₦{depositPreview.fee.toLocaleString('en-NG')}</span></p>
                  <p>Total to pay: <span className="font-semibold text-[#f26522]">₦{depositPreview.total.toLocaleString('en-NG')}</span></p>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Fees: ₦100 (₦2,000–₦10,000) · ₦200 (₦10,001–₦19,999) · ₦300 (₦20,000+)
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || verifyingRedirect || recoveringDeposit}
              className="w-full max-w-md btn-orange py-2.5 text-sm disabled:opacity-60"
            >
              {verifyingRedirect || recoveringDeposit
                ? 'Verifying payment...'
                : submitting
                  ? 'Redirecting to Kora...'
                  : 'Proceed to Payment'}
            </button>
          </form>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close payment confirmation"
            onClick={() => setConfirmOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-confirm-title"
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-dm-surface border border-gray-200 dark:border-dm-border shadow-xl p-6 text-center"
          >
            <p className="text-3xl mb-2" aria-hidden="true">⚠️</p>
            <h2
              id="payment-confirm-title"
              className="text-3xl font-extrabold text-gray-900 dark:text-gray-100"
            >
              Attention!!!
            </h2>

            <p className="mt-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Please ensure you pay the exact amount shown, including all applicable charges.
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Paying less or more than the specified amount may result in delays or a failed transaction.
            </p>
            {totalPaymentPreview != null && depositPreview && typeof depositPreview !== 'string' ? (
              <div className="mt-4 rounded-md border border-gray-200 dark:border-dm-border bg-gray-50 dark:bg-dm-product-row px-3 py-3 text-sm text-gray-800 dark:text-gray-100 space-y-1 text-left">
                <p>Wallet credit: <span className="font-semibold">₦{depositPreview.walletCredit.toLocaleString('en-NG')}</span></p>
                <p>Processing fee: <span className="font-semibold">₦{depositPreview.fee.toLocaleString('en-NG')}</span></p>
                <p>You will pay: <span className="font-bold text-[#f26522]">₦{depositPreview.total.toLocaleString('en-NG')}</span></p>
              </div>
            ) : null}
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Thank you for your attention.
            </p>

            <button
              type="button"
              disabled={submitting || verifyingRedirect}
              onClick={() => void handleSubmit()}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-[#f26522] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d94e0f] disabled:opacity-60"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
