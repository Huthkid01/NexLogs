import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/hooks/useSiteContent';
import { isKoraConfigured, isKoraTestMode } from '@/lib/kora-config';
import { hasSupabaseConfig } from '@/lib/mock-mode';
import {
  convertCurrencyToUsd,
  convertUsdToCurrency,
  DISPLAY_RATE_CURRENCIES,
} from '@/lib/wallet-exchange-rates';
import { completeKoraRedirect, startKoraDeposit } from '@/services/payment.service';

const CURRENCIES = [
  { code: 'NGN', label: 'NGN' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
  { code: 'GBP', label: 'GBP' },
] as const;

const PAYMENT_METHODS = [
  { value: '', label: 'Select method' },
  { value: 'card', label: 'Credit/Debit Card/Bank Transfer' },
  { value: 'crypto', label: 'Cryptocurrency' },
] as const;

const inputClassName =
  'w-full h-10 rounded-md border border-gray-300 dark:border-dm-input-border bg-white dark:bg-dm-input px-3 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-dm-input-border';

const toggleButtonClassName =
  'flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-sm font-medium text-[#f26522] border border-[#f26522] rounded-md hover:bg-[#fff3eb] dark:hover:bg-[#f26522]/10 transition-colors';

function formatRate(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AddFundsPage() {
  const { user, profile } = useAuth();
  const { content } = useSiteContent();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]['code']>('NGN');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showRates, setShowRates] = useState(false);
  const [baseUsdAmount, setBaseUsdAmount] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingRedirect, setVerifyingRedirect] = useState(false);
  const redirectHandled = useRef(false);

  useEffect(() => {
    if (!user?.id || redirectHandled.current || verifyingRedirect) return;
    if (!searchParams.get('reference')) return;

    redirectHandled.current = true;
    setVerifyingRedirect(true);
    void (async () => {
      try {
        const completed = await completeKoraRedirect(searchParams);
        if (!completed) return;

        await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
        await queryClient.invalidateQueries({ queryKey: ['profile-stats', user.id] });
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
  }, [user?.id, searchParams, setSearchParams, queryClient, verifyingRedirect]);

  const exchangeRates = content.wallet.exchangeRates;

  const parsedBaseUsd = useMemo(() => {
    const value = parseFloat(baseUsdAmount);
    if (!baseUsdAmount.trim() || Number.isNaN(value) || value < 0) return 0;
    return value;
  }, [baseUsdAmount]);

  const handleBaseUsdChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBaseUsdAmount(value);
    }
  };

  const handleBaseUsdBlur = () => {
    if (!baseUsdAmount.trim() || parsedBaseUsd <= 0) {
      setBaseUsdAmount('1');
    }
  };

  const convertedRates = useMemo(() => {
    if (parsedBaseUsd <= 0) return [];

    return DISPLAY_RATE_CURRENCIES.map((item) => ({
      ...item,
      converted: convertUsdToCurrency(parsedBaseUsd, exchangeRates[item.code] ?? 0),
    }));
  }, [exchangeRates, parsedBaseUsd]);

  const usdEquivalent = useMemo(() => {
    const value = parseFloat(amount);
    if (!amount || Number.isNaN(value) || value <= 0) return '0.00';
    return convertCurrencyToUsd(value, currency, exchangeRates).toFixed(2);
  }, [amount, currency, exchangeRates]);

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
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (paymentMethod === 'crypto') {
      toast.info('Cryptocurrency deposits are not available yet');
      return;
    }

    setSubmitting(true);
    try {
      if (!hasSupabaseConfig()) {
        toast.error('Wallet deposits require Supabase. Add your Supabase keys and redeploy.');
        return;
      }

      if (!isKoraConfigured()) {
        toast.error('Kora is not configured. Add VITE_KORA_PUBLIC_KEY to your environment.');
        return;
      }

      if (!user.email) {
        toast.error('Your account email is required for payment');
        return;
      }

      await startKoraDeposit({
        userId: user.id,
        email: user.email,
        name: profile?.full_name,
        amount: value,
        currency,
        amountUsd: Number(usdEquivalent),
        paymentMethod: paymentMethod === 'card' ? 'kora_card' : 'kora',
        exchangeRates,
      });

      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile-stats', user.id] });
      toast.success('Payment successful. Funds added to your wallet.');
      setAmount('');
      setPaymentMethod('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      if (message !== 'Payment cancelled') {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-dm-bg min-h-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className={`mx-auto bg-white dark:bg-dm-surface rounded-xl border border-gray-200 dark:border-dm-border shadow-sm p-5 sm:p-8 ${showRates ? 'max-w-3xl' : 'max-w-2xl'}`}>
          {showRates ? (
            <>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Exchange Rates</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Admin-set USD conversions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRates(false)}
                  className={toggleButtonClassName}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Deposit
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
                  <div className="flex min-h-[180px] flex-col justify-between bg-[#1a2233] p-5 sm:min-h-[300px]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#f26522] mb-5">
                        Base Currency
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[32px] font-bold text-white leading-none shrink-0">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={baseUsdAmount}
                          onChange={(e) => handleBaseUsdChange(e.target.value)}
                          onBlur={handleBaseUsdBlur}
                          aria-label="USD amount"
                          className="min-w-0 flex-1 rounded-md border border-[#2f3a53] bg-[#253047] px-3 py-2 text-2xl font-bold leading-none text-white focus:outline-none focus:ring-0 focus:border-[#f26522]"
                        />
                      </div>
                      <p className="mt-3 text-sm text-gray-400">United States Dollar</p>
                    </div>
                    <span className="mt-6 inline-flex w-fit rounded-md bg-[#243044] px-2.5 py-1 text-xs font-medium text-gray-300 sm:mt-8">
                      USD
                    </span>
                  </div>

                  <div className="space-y-3 bg-white p-4">
                    {convertedRates.map((item) => (
                      <div
                        key={item.code}
                        className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.code}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.name}</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900 tabular-nums">
                          {formatRate(item.converted)}
                        </p>
                      </div>
                    ))}

                    <p className="text-xs text-gray-500 pt-1">
                      Rates are set by the admin and used when adding funds to your wallet.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRates(false)}
                className="w-full mt-6 text-sm font-medium text-[#f26522] hover:underline"
              >
                Back to deposit
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Add Funds</h1>
                <button
                  type="button"
                  onClick={() => {
                    setBaseUsdAmount('1');
                    setShowRates(true);
                  }}
                  className={toggleButtonClassName}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  View Rates
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Choose amount and payment method</p>

              {verifyingRedirect && (
                <div className="flex items-center gap-2 rounded-lg bg-[#fff3eb] border border-[#fde0cc] px-3 py-2.5 mb-4">
                  <Info className="h-4 w-4 text-[#f26522] shrink-0" />
                  <p className="text-sm text-gray-800">Verifying your payment with Kora…</p>
                </div>
              )}

              {isKoraTestMode() && import.meta.env.DEV && (
                <div className="flex items-start gap-2 rounded-lg bg-[#fff3eb] border border-[#fde0cc] px-3 py-2.5 mb-4">
                  <Info className="h-4 w-4 text-[#f26522] shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-800">
                    Kora test mode is active. Use your Kora dashboard test cards and bank accounts for sandbox payments.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-[#fff8e6] dark:bg-[#f26522] border border-[#f5e6b8] dark:border-[#f26522] px-3 py-2.5 mb-6">
                <Info className="h-4 w-4 text-amber-700 dark:text-white shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 dark:text-white">Payments are processed securely by Kora. We do not store your card details.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                      Amount
                    </label>
                    <input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`${inputClassName} placeholder:text-gray-400`}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">≈ ${usdEquivalent} USD added to wallet</p>
                  </div>

                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                      Select Currency
                    </label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as (typeof CURRENCIES)[number]['code'])}
                      className={inputClassName}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="payment-method" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={`${inputClassName} ${paymentMethod ? '' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value || 'default'} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full max-w-md btn-orange py-2.5 text-sm disabled:opacity-60"
                >
                  {submitting ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
