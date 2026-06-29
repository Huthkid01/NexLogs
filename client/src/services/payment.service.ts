import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  createDepositReference,
  getKoraPublicKey,
  isKoraConfigured,
} from '@/lib/kora-config';
import {
  getFlutterwavePublicKey,
  isFlutterwaveConfigured,
} from '@/lib/flutterwave-config';
import { profileService } from '@/services/profile.service';
import {
  convertCurrencyToUsd,
  convertUsdToCurrency,
  type WalletExchangeRates,
} from '@/lib/wallet-exchange-rates';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from '@/lib/safe-storage';

export interface StartDepositParams {
  userId: string;
  email: string;
  name?: string;
  amount: number;
  currency: string;
  amountUsd: number;
  paymentMethod: string;
  exchangeRates: WalletExchangeRates;
  onPaymentModalOpened?: () => void;
  onPaymentConfirmed?: () => void;
  onPaymentChecking?: () => void;
}

interface PendingDeposit {
  provider: 'kora' | 'flutterwave';
  reference: string;
  amount: number;
  currency: string;
  chargeAmount: number;
  chargeCurrency: string;
  amountUsd: number;
  paymentMethod: string;
  flutterwaveTransactionId?: number;
}

const PENDING_DEPOSIT_KEY = 'nexlogs_pending_deposit';
const KORA_SCRIPT_URL =
  'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';
const FLUTTERWAVE_SCRIPT_URL = 'https://checkout.flutterwave.com/v3.js';

const KORA_SUPPORTED_CURRENCIES = new Set(['NGN', 'KES', 'GHS']);

/** Quick check when user closes modal — don't block for 30s. */
const QUICK_VERIFY_DELAYS_MS = [0, 1500, 3000];

/** Retry up to ~30s — Kora can lag after successful payment. */
const VERIFY_RETRY_DELAYS_MS = [0, 1500, 3000, 5000, 8000, 12000];

function savePendingDeposit(pending: PendingDeposit) {
  safeStorageSet(PENDING_DEPOSIT_KEY, JSON.stringify(pending));
}

function clearPendingDeposit() {
  safeStorageRemove(PENDING_DEPOSIT_KEY);
}

export function getPendingDeposit(): PendingDeposit | null {
  try {
    const raw = safeStorageGet(PENDING_DEPOSIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDeposit;
    if (!parsed.provider) {
      parsed.provider = 'kora';
    }
    return parsed;
  } catch {
    return null;
  }
}

function getDepositChargeDetails(
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

function closeKoraModal() {
  try {
    window.Korapay?.close();
  } catch {
    // Modal may already be closed.
  }
}

function loadFlutterwaveScript() {
  if (window.FlutterwaveCheckout) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-flutterwave-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Flutterwave')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = FLUTTERWAVE_SCRIPT_URL;
    script.async = true;
    script.dataset.flutterwaveCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Flutterwave checkout'));
    document.body.appendChild(script);
  });
}

function buildFlutterwaveVerifyBody(
  txRef: string,
  paymentMethod: string,
  transactionId?: number,
) {
  const pending = getPendingDeposit();
  const body: Record<string, string | number> = {
    tx_ref: txRef,
    payment_method: paymentMethod,
  };

  if (transactionId && transactionId > 0) {
    body.transaction_id = transactionId;
  }

  if (pending?.reference === txRef) {
    body.expected_amount = pending.amount;
    body.expected_currency = pending.currency;
    body.amount_usd = pending.amountUsd;
    body.original_amount = pending.amount;
    body.original_currency = pending.currency;
  }

  return body;
}

async function invokeFlutterwaveVerify(body: Record<string, string | number>) {
  const { data, error } = await supabase.functions.invoke('flutterwave-verify', { body });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, data));
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  return data;
}

async function verifyFlutterwaveDeposit(input: {
  transactionId: number;
  txRef: string;
  paymentMethod: string;
}) {
  return invokeFlutterwaveVerify(
    buildFlutterwaveVerifyBody(input.txRef, input.paymentMethod, input.transactionId),
  );
}

async function verifyFlutterwaveDepositByRef(input: { txRef: string; paymentMethod: string }) {
  return invokeFlutterwaveVerify(
    buildFlutterwaveVerifyBody(input.txRef, input.paymentMethod),
  );
}

async function verifyFlutterwaveWithRetry(
  verify: () => Promise<unknown>,
  delays = VERIFY_RETRY_DELAYS_MS,
) {
  let lastError: Error | null = null;

  for (const delayMs of delays) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      return await verify();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Payment verification failed');
      const message = lastError.message.toLowerCase();
      const retryable =
        message.includes('not successful') ||
        message.includes('verification failed') ||
        message.includes('network') ||
        message.includes('fetch');

      if (!retryable) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Payment verification failed');
}

async function verifyFlutterwaveDepositWithRetry(
  transactionId: number,
  txRef: string,
  paymentMethod: string,
  delays = VERIFY_RETRY_DELAYS_MS,
) {
  return verifyFlutterwaveWithRetry(
    () => verifyFlutterwaveDeposit({ transactionId, txRef, paymentMethod }),
    delays,
  );
}

async function verifyFlutterwaveDepositByRefWithRetry(
  txRef: string,
  paymentMethod: string,
  delays = VERIFY_RETRY_DELAYS_MS,
) {
  return verifyFlutterwaveWithRetry(
    () => verifyFlutterwaveDepositByRef({ txRef, paymentMethod }),
    delays,
  );
}

async function verifyKoraDeposit(reference: string, paymentMethod: string) {
  const pending = getPendingDeposit();
  const body: Record<string, string | number> = {
    reference,
    payment_method: paymentMethod,
  };

  if (pending?.reference === reference) {
    body.expected_amount = pending.amount;
    body.expected_currency = pending.currency;
    body.expected_amount_usd = pending.amountUsd;
    body.charge_amount = pending.chargeAmount;
    body.charge_currency = pending.chargeCurrency;
  }

  const { data, error } = await supabase.functions.invoke('kora-verify', {
    body,
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, data));
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  return data;
}

async function verifyKoraDepositWithRetry(
  reference: string,
  paymentMethod: string,
  delays = VERIFY_RETRY_DELAYS_MS,
) {
  let lastError: Error | null = null;

  for (const delayMs of delays) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      return await verifyKoraDeposit(reference, paymentMethod);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Payment verification failed');
      const message = lastError.message.toLowerCase();

      const retryable =
        message.includes('not successful') ||
        message.includes('verification failed') ||
        message.includes('network') ||
        message.includes('fetch');

      if (!retryable) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Payment verification failed');
}

/** Resume a previous deposit session after refresh (Kora or Flutterwave). */
export async function resumePendingDeposit() {
  const pending = getPendingDeposit();
  if (!pending?.reference) return false;

  if (pending.provider === 'flutterwave') {
    if (pending.flutterwaveTransactionId) {
      await verifyFlutterwaveDepositWithRetry(
        pending.flutterwaveTransactionId,
        pending.reference,
        pending.paymentMethod,
      );
    } else {
      await verifyFlutterwaveDepositByRefWithRetry(pending.reference, pending.paymentMethod);
    }
  } else {
    await verifyKoraDepositWithRetry(pending.reference, pending.paymentMethod);
  }

  clearPendingDeposit();
  return true;
}

/** @deprecated Use resumePendingDeposit */
export const resumePendingKoraDeposit = resumePendingDeposit;

export async function finalizeDepositSuccess(
  userId: string,
  previousBalance: number,
  refetch: () => Promise<unknown>,
) {
  await Promise.race([
    waitForWalletBalanceIncrease(userId, previousBalance, 15_000),
    new Promise((resolve) => setTimeout(resolve, 8000)),
  ]);
  await refetch();
}

export async function waitForWalletBalanceIncrease(
  userId: string,
  previousBalance: number,
  maxWaitMs = 20_000,
) {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const stats = await profileService.getStats(userId);
    if (stats.balance > previousBalance) {
      return stats.balance;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const stats = await profileService.getStats(userId);
  return stats.balance > previousBalance ? stats.balance : null;
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

  await verifyKoraDepositWithRetry(reference, pending?.paymentMethod ?? 'kora');
  clearPendingDeposit();
  return true;
}

export interface DepositResult {
  status: 'completed' | 'pending';
}

/** @deprecated Use DepositResult */
export type KoraDepositResult = DepositResult;

export async function startKoraDeposit(params: StartDepositParams): Promise<DepositResult> {
  if (!isKoraConfigured()) {
    throw new Error('Kora is not configured. Add VITE_KORA_PUBLIC_KEY to your environment.');
  }

  await loadKoraScript();

  if (!window.Korapay) {
    throw new Error('Kora checkout failed to initialize');
  }

  const publicKey = getKoraPublicKey()!;
  const reference = createDepositReference(params.userId);
  const { chargeAmount, chargeCurrency } = getDepositChargeDetails(
    params.amount,
    params.currency,
    params.exchangeRates,
  );

  if (chargeAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  savePendingDeposit({
    provider: 'kora',
    reference,
    amount: params.amount,
    currency: params.currency,
    chargeAmount,
    chargeCurrency,
    amountUsd: params.amountUsd,
    paymentMethod: params.paymentMethod,
  });

  const merchantReference = reference;

  return new Promise<DepositResult>((resolve, reject) => {
    let settled = false;
    let verificationPromise: Promise<unknown> | null = null;

    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      handler();
    };

    const ensureVerified = (reference = merchantReference) => {
      if (!verificationPromise) {
        verificationPromise = verifyKoraDepositWithRetry(
          reference,
          params.paymentMethod,
        ).then(() => {
          clearPendingDeposit();
        });
      }
      return verificationPromise;
    };

    const handlePaymentConfirmed = (reference = merchantReference) => {
      closeKoraModal();
      params.onPaymentConfirmed?.();
      void ensureVerified(reference)
        .then(() => finish(() => resolve({ status: 'completed' })))
        .catch((err) =>
          finish(() =>
            reject(err instanceof Error ? err : new Error('Payment verification failed')),
          ),
        );
    };

    const handleCloseMaybePaid = () => {
      closeKoraModal();
      void (async () => {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
        if (settled) return;

        try {
          await verifyKoraDepositWithRetry(
            merchantReference,
            params.paymentMethod,
            QUICK_VERIFY_DELAYS_MS,
          );
          params.onPaymentConfirmed?.();
          clearPendingDeposit();
          finish(() => resolve({ status: 'completed' }));
        } catch {
          finish(() => resolve({ status: 'pending' }));
        }
      })();
    };

    window.Korapay!.initialize({
      key: publicKey,
      reference: merchantReference,
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
        wallet_amount: String(params.amount),
        wallet_currency: params.currency,
        wallet_amount_usd: String(params.amountUsd),
      },
      onSuccess: (data) => {
        const reference = data?.reference?.trim() || merchantReference;
        handlePaymentConfirmed(reference);
      },
      onFailed: (data) => {
        const reference = data?.reference?.trim() || merchantReference;
        params.onPaymentChecking?.();
        void verifyKoraDepositWithRetry(reference, params.paymentMethod, QUICK_VERIFY_DELAYS_MS)
          .then(() => {
            clearPendingDeposit();
            finish(() => resolve({ status: 'completed' }));
          })
          .catch(() => finish(() => resolve({ status: 'pending' })));
      },
      onPending: () => {
        closeKoraModal();
        params.onPaymentChecking?.();
        void verifyKoraDepositWithRetry(merchantReference, params.paymentMethod, QUICK_VERIFY_DELAYS_MS)
          .then(() => {
            clearPendingDeposit();
            finish(() => resolve({ status: 'completed' }));
          })
          .catch(() => finish(() => resolve({ status: 'pending' })));
      },
      onClose: () => {
        if (settled) return;
        handleCloseMaybePaid();
      },
    });

    params.onPaymentModalOpened?.();
  });
}

export async function startFlutterwaveDeposit(params: StartDepositParams): Promise<DepositResult> {
  if (!isFlutterwaveConfigured()) {
    throw new Error(
      'Flutterwave is not configured. Add VITE_FLUTTERWAVE_PUBLIC_KEY to your environment.',
    );
  }

  await loadFlutterwaveScript();

  if (!window.FlutterwaveCheckout) {
    throw new Error('Flutterwave checkout failed to initialize');
  }

  const publicKey = getFlutterwavePublicKey()!;
  const txRef = createDepositReference(params.userId);
  const { chargeAmount, chargeCurrency } = getDepositChargeDetails(
    params.amount,
    params.currency,
    params.exchangeRates,
  );

  if (chargeAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  savePendingDeposit({
    provider: 'flutterwave',
    reference: txRef,
    amount: params.amount,
    currency: params.currency,
    chargeAmount,
    chargeCurrency,
    amountUsd: params.amountUsd,
    paymentMethod: 'flutterwave',
  });

  return new Promise<DepositResult>((resolve, reject) => {
    let settled = false;
    let callbackReceived = false;
    let verificationPromise: Promise<unknown> | null = null;

    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      handler();
    };

    const persistFlutterwaveTransactionId = (transactionId?: number) => {
      if (!transactionId || transactionId <= 0) return;
      const pending = getPendingDeposit();
      if (pending) {
        savePendingDeposit({ ...pending, flutterwaveTransactionId: transactionId });
      }
    };

    const ensureVerified = (transactionId: number | undefined, reference: string) => {
      if (!verificationPromise) {
        verificationPromise = (async () => {
          if (transactionId && transactionId > 0) {
            await verifyFlutterwaveDepositWithRetry(transactionId, reference, 'flutterwave');
          } else {
            await verifyFlutterwaveDepositByRefWithRetry(reference, 'flutterwave');
          }
          clearPendingDeposit();
        })();
      }
      return verificationPromise;
    };

    const handlePaymentCancelled = () => {
      clearPendingDeposit();
      finish(() => reject(new Error('Payment cancelled')));
    };

    const handlePaymentSuccess = (transactionId: number | undefined, reference: string) => {
      callbackReceived = true;
      persistFlutterwaveTransactionId(transactionId);
      params.onPaymentConfirmed?.();
      void ensureVerified(transactionId, reference)
        .then(() => finish(() => resolve({ status: 'completed' })))
        .catch((err) =>
          finish(() =>
            reject(err instanceof Error ? err : new Error('Payment verification failed')),
          ),
        );
    };

    const handleCloseMaybePaid = () => {
      void (async () => {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
        if (settled) return;
        if (callbackReceived) return;

        params.onPaymentChecking?.();
        const pending = getPendingDeposit();
        const reference = pending?.reference ?? txRef;

        try {
          const txId = pending?.flutterwaveTransactionId;
          if (txId) {
            await verifyFlutterwaveDepositWithRetry(
              txId,
              reference,
              'flutterwave',
              QUICK_VERIFY_DELAYS_MS,
            );
          } else {
            await verifyFlutterwaveDepositByRefWithRetry(
              reference,
              'flutterwave',
              QUICK_VERIFY_DELAYS_MS,
            );
          }
          params.onPaymentConfirmed?.();
          clearPendingDeposit();
          finish(() => resolve({ status: 'completed' }));
        } catch {
          finish(() => resolve({ status: 'pending' }));
        }
      })();
    };

    window.FlutterwaveCheckout!({
      public_key: publicKey,
      tx_ref: txRef,
      amount: chargeAmount,
      currency: chargeCurrency,
      payment_options: 'card,ussd,banktransfer',
      customer: {
        email: params.email,
        name: params.name || params.email,
      },
      customizations: {
        title: 'Nexlogs',
        description: 'Add funds to your wallet',
      },
      meta: {
        userId: params.userId.slice(0, 20),
        source: 'nexlogs-wallet',
        wallet_amount: String(params.amount),
        wallet_currency: params.currency,
      },
      callback: (response) => {
        const status = String(response.status ?? '').toLowerCase();
        const transactionId = Number(response.transaction_id);
        const reference = String(response.tx_ref ?? txRef);

        if (status === 'successful') {
          handlePaymentSuccess(transactionId > 0 ? transactionId : undefined, reference);
          return;
        }

        if (status === 'cancelled') {
          handlePaymentCancelled();
        }
      },
      onclose: () => {
        if (settled) return;
        handleCloseMaybePaid();
      },
    });

    params.onPaymentModalOpened?.();
  });
}
