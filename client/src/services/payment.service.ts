import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  createDepositReference,
  getKoraPublicKey,
  isKoraConfigured,
} from '@/lib/kora-config';
import type { KoraCheckoutSuccess } from '@/types/kora';
import {
  convertCurrencyToUsd,
  convertUsdToCurrency,
  type WalletExchangeRates,
} from '@/lib/wallet-exchange-rates';

export interface StartDepositParams {
  userId: string;
  email: string;
  name?: string;
  amount: number;
  currency: string;
  amountUsd: number;
  paymentMethod: string;
  exchangeRates: WalletExchangeRates;
}

interface PendingDeposit {
  reference: string;
  amount: number;
  currency: string;
  chargeAmount: number;
  chargeCurrency: string;
  amountUsd: number;
  paymentMethod: string;
}

const PENDING_DEPOSIT_KEY = 'nexlogs_pending_deposit';
const KORA_SCRIPT_URL =
  'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';

const KORA_SUPPORTED_CURRENCIES = new Set(['NGN', 'KES', 'GHS']);

function savePendingDeposit(pending: PendingDeposit) {
  localStorage.setItem(PENDING_DEPOSIT_KEY, JSON.stringify(pending));
}

function clearPendingDeposit() {
  localStorage.removeItem(PENDING_DEPOSIT_KEY);
}

function getPendingDeposit(): PendingDeposit | null {
  try {
    const raw = localStorage.getItem(PENDING_DEPOSIT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingDeposit;
  } catch {
    return null;
  }
}

function getKoraChargeDetails(
  amount: number,
  currency: string,
  exchangeRates: WalletExchangeRates,
) {
  const code = currency.toUpperCase();
  if (KORA_SUPPORTED_CURRENCIES.has(code)) {
    return {
      chargeAmount: Math.round(amount),
      chargeCurrency: code,
    };
  }

  const usd = convertCurrencyToUsd(amount, code, exchangeRates);
  const ngnAmount = convertUsdToCurrency(usd, exchangeRates.NGN ?? 1500);
  return {
    chargeAmount: Math.round(ngnAmount),
    chargeCurrency: 'NGN',
  };
}

async function readFunctionErrorMessage(error: unknown, data: unknown) {
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return String(data.error);
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
        return String(payload.error);
      }
    } catch {
      // Fall through to generic message.
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Payment verification failed';
}

function loadKoraScript() {
  if (window.Korapay) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-kora-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Kora')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = KORA_SCRIPT_URL;
    script.async = true;
    script.dataset.koraCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Kora checkout'));
    document.body.appendChild(script);
  });
}

async function verifyKoraDeposit(reference: string, paymentMethod: string) {
  const { data, error } = await supabase.functions.invoke('kora-verify', {
    body: {
      reference,
      payment_method: paymentMethod,
    },
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, data));
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  return data;
}

export async function completeKoraRedirect(searchParams: URLSearchParams) {
  const reference = searchParams.get('reference');
  if (!reference) return false;

  const pending = getPendingDeposit();
  if (pending && pending.reference !== reference) {
    throw new Error(
      'Payment session expired. If you were charged, contact support with reference: ' + reference,
    );
  }

  await verifyKoraDeposit(reference, pending?.paymentMethod ?? 'kora');
  clearPendingDeposit();
  return true;
}

export async function startKoraDeposit(params: StartDepositParams) {
  if (!isKoraConfigured()) {
    throw new Error('Kora is not configured. Add VITE_KORA_PUBLIC_KEY to your environment.');
  }

  await loadKoraScript();

  if (!window.Korapay) {
    throw new Error('Kora checkout failed to initialize');
  }

  const publicKey = getKoraPublicKey()!;
  const reference = createDepositReference(params.userId);
  const { chargeAmount, chargeCurrency } = getKoraChargeDetails(
    params.amount,
    params.currency,
    params.exchangeRates,
  );

  if (chargeAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  savePendingDeposit({
    reference,
    amount: params.amount,
    currency: params.currency,
    chargeAmount,
    chargeCurrency,
    amountUsd: params.amountUsd,
    paymentMethod: params.paymentMethod,
  });

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let verifying = false;

    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      handler();
    };

    window.Korapay!.initialize({
      key: publicKey,
      reference,
      amount: chargeAmount,
      currency: chargeCurrency,
      narration: 'Add funds to your Nexlogs wallet',
      channels: ['card', 'bank_transfer', 'pay_with_bank'],
      default_channel: 'card',
      customer: {
        email: params.email,
        name: params.name || params.email,
      },
      metadata: {
        userId: params.userId.slice(0, 20),
        source: 'nexlogs-wallet',
      },
      onSuccess: (data: KoraCheckoutSuccess) => {
        void (async () => {
          try {
            verifying = true;
            await verifyKoraDeposit(data.reference || reference, params.paymentMethod);
            clearPendingDeposit();
            finish(() => resolve());
          } catch (err) {
            finish(() => reject(err instanceof Error ? err : new Error('Payment verification failed')));
          } finally {
            verifying = false;
          }
        })();
      },
      onFailed: () => {
        finish(() => reject(new Error('Payment was not successful')));
      },
      onClose: () => {
        setTimeout(() => {
          if (!settled && !verifying) {
            finish(() => reject(new Error('Payment cancelled')));
          }
        }, 5000);
      },
    });
  });
}
