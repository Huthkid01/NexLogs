import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getDepositChargeNgn, MIN_WALLET_DEPOSIT_NGN } from '@/lib/wallet-deposit-fees';
import { profileService } from '@/services/profile.service';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from '@/lib/safe-storage';

export interface StartDepositParams {
  userId: string;
  email: string;
  name?: string;
  amount: number;
  currency: string;
  walletAmount: number;
  paymentMethod: string;
  onPaymentModalOpened?: () => void;
  onPaymentConfirmed?: () => void;
  onPaymentChecking?: () => void;
}

interface PendingDeposit {
  userId: string;
  provider: 'kora' | 'flutterwave';
  reference: string;
  amount: number;
  currency: string;
  chargeAmount: number;
  chargeCurrency: string;
  walletAmount: number;
  paymentMethod: string;
  flutterwaveTransactionId?: number;
  createdAt: string;
  resumeOnLoad?: boolean;
}

const PENDING_DEPOSIT_KEY = 'nexlogs_pending_deposit';
const PENDING_DEPOSIT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PENDING_INTENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingWalletPaymentIntent {
  reference: string;
  expected_amount_ngn: number;
  charge_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

/** Retry briefly while Kora is still pending after a real payment. */
const VERIFY_RETRY_DELAYS_MS = [0, 1500, 3000, 5000];
/** Redirect return: one quick re-check only if still pending (cancel should exit immediately). */
const VERIFY_REDIRECT_RETRY_DELAYS_MS = [0, 2000];

function pendingDepositStorageKey(userId: string) {
  return `${PENDING_DEPOSIT_KEY}:${userId}`;
}

function savePendingDeposit(pending: PendingDeposit) {
  safeStorageSet(
    pendingDepositStorageKey(pending.userId),
    JSON.stringify({
      ...pending,
      createdAt: pending.createdAt || new Date().toISOString(),
      resumeOnLoad: pending.resumeOnLoad ?? false,
    }),
  );
  safeStorageRemove(PENDING_DEPOSIT_KEY);
}

function clearPendingDeposit(userId?: string) {
  if (userId) {
    safeStorageRemove(pendingDepositStorageKey(userId));
  }
  safeStorageRemove(PENDING_DEPOSIT_KEY);
}

function isPendingDepositFresh(pending: PendingDeposit) {
  const createdAtMs = new Date(pending.createdAt).getTime();
  return Number.isFinite(createdAtMs) && Date.now() - createdAtMs <= PENDING_DEPOSIT_MAX_AGE_MS;
}

export function getPendingDeposit(userId?: string): PendingDeposit | null {
  try {
    const raw = userId
      ? safeStorageGet(pendingDepositStorageKey(userId))
      : safeStorageGet(PENDING_DEPOSIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDeposit;
    if (!parsed.provider) {
      parsed.provider = 'kora';
    }
    if (!parsed.userId || !parsed.createdAt || !isPendingDepositFresh(parsed)) {
      clearPendingDeposit(userId);
      return null;
    }
    if (userId && parsed.userId !== userId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getDepositChargeDetails(walletAmountNgn: number, currency: string) {
  const code = currency.toUpperCase();
  const walletAmount = Math.round(Number(walletAmountNgn));
  if (!Number.isFinite(walletAmount) || walletAmount < MIN_WALLET_DEPOSIT_NGN) {
    throw new Error(`Minimum deposit amount is NGN ${MIN_WALLET_DEPOSIT_NGN.toLocaleString('en-NG')}`);
  }

  return {
    walletAmount,
    chargeAmount: getDepositChargeNgn(walletAmount),
    chargeCurrency: code === 'NGN' ? 'NGN' : 'NGN',
  };
}

async function readFunctionErrorMessage(error: unknown, data: unknown) {
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return String(data.error);
  }

  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    if (response) {
      try {
        const payload = await response.clone().json();
        if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
          return String(payload.error);
        }
      } catch {
        try {
          const text = (await response.clone().text()).trim();
          if (text) return text.slice(0, 300);
        } catch {
          // Fall through.
        }
      }
    }
  }

  if (error instanceof Error && error.message) {
    // Supabase often surfaces only "Edge Function returned a non-2xx status code".
    if (/non-2xx status code/i.test(error.message)) {
      return 'Payment service returned an error. Please try again in a moment.';
    }
    return error.message;
  }

  return 'Payment verification failed';
}

function buildFlutterwaveVerifyBody(
  txRef: string,
  paymentMethod: string,
  userId: string,
  transactionId?: number,
) {
  const pending = getPendingDeposit(userId);
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
    body.wallet_amount = pending.walletAmount;
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
  userId: string;
}) {
  return invokeFlutterwaveVerify(
    buildFlutterwaveVerifyBody(input.txRef, input.paymentMethod, input.userId, input.transactionId),
  );
}

async function verifyFlutterwaveDepositByRef(input: { txRef: string; paymentMethod: string; userId: string }) {
  return invokeFlutterwaveVerify(
    buildFlutterwaveVerifyBody(input.txRef, input.paymentMethod, input.userId),
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
  userId: string,
  delays = VERIFY_RETRY_DELAYS_MS,
) {
  return verifyFlutterwaveWithRetry(
    () => verifyFlutterwaveDeposit({ transactionId, txRef, paymentMethod, userId }),
    delays,
  );
}

async function verifyFlutterwaveDepositByRefWithRetry(
  txRef: string,
  paymentMethod: string,
  userId: string,
  delays = VERIFY_RETRY_DELAYS_MS,
) {
  return verifyFlutterwaveWithRetry(
    () => verifyFlutterwaveDepositByRef({ txRef, paymentMethod, userId }),
    delays,
  );
}

class KoraVerifyError extends Error {
  code?: string;
  retryable: boolean;

  constructor(message: string, options?: { code?: string; retryable?: boolean }) {
    super(message);
    this.name = 'KoraVerifyError';
    this.code = options?.code;
    this.retryable = options?.retryable ?? false;
  }
}

function koraVerifyErrorFromPayload(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') {
    return new KoraVerifyError(fallback, { retryable: false });
  }

  const record = data as Record<string, unknown>;
  const message = record.error ? String(record.error) : fallback;
  const code = typeof record.code === 'string' ? record.code : undefined;
  const retryable =
    typeof record.retryable === 'boolean'
      ? record.retryable
      : code === 'payment_pending' || /still pending/i.test(message);

  return new KoraVerifyError(message, { code, retryable });
}

function isRetryableVerifyError(error: Error) {
  if (error instanceof KoraVerifyError) return error.retryable;

  const message = error.message.toLowerCase();
  if (
    message.includes('cancelled')
    || message.includes('canceled')
    || message.includes('no money was charged')
    || message.includes('not successful')
  ) {
    return false;
  }

  return (
    message.includes('still pending')
    || message.includes('payment_pending')
    || message.includes('network')
    || message.includes('fetch')
    || message.includes('non-2xx')
  );
}

async function verifyKoraDeposit(reference: string, paymentMethod: string, userId: string) {
  const pending = getPendingDeposit(userId);
  const body: Record<string, string | number> = {
    reference,
    payment_method: paymentMethod,
  };

  if (pending?.reference === reference) {
    body.expected_amount = pending.amount;
    body.expected_currency = pending.currency;
    body.wallet_amount = pending.walletAmount;
    body.charge_amount = pending.chargeAmount;
    body.charge_currency = pending.chargeCurrency;
  }

  const { data, error } = await supabase.functions.invoke('kora-verify', {
    body,
  });

  if (error) {
    const message = await readFunctionErrorMessage(error, data);
    throw koraVerifyErrorFromPayload(data, message);
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw koraVerifyErrorFromPayload(data, String(data.error));
  }

  return data;
}

async function verifyKoraDepositWithRetry(
  reference: string,
  paymentMethod: string,
  userId: string,
  delays = VERIFY_RETRY_DELAYS_MS,
) {
  let lastError: Error | null = null;

  for (const delayMs of delays) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      return await verifyKoraDeposit(reference, paymentMethod, userId);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Payment verification failed');
      if (!isRetryableVerifyError(lastError)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Payment verification failed');
}

export async function getPendingWalletPaymentIntents(userId: string): Promise<PendingWalletPaymentIntent[]> {
  const { data, error } = await supabase
    .from('wallet_payment_intents')
    .select('reference, expected_amount_ngn, charge_amount, payment_method, status, created_at')
    .eq('user_id', userId)
    .eq('provider', 'kora')
    .in('status', ['pending', 'processing'])
    .is('wallet_transaction_id', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message || 'Could not load pending payments');
  }

  return (data ?? []).filter((row) => {
    const createdAtMs = new Date(String(row.created_at)).getTime();
    return Number.isFinite(createdAtMs) && Date.now() - createdAtMs <= PENDING_INTENT_MAX_AGE_MS;
  }).map((row) => ({
    reference: String(row.reference),
    expected_amount_ngn: Number(row.expected_amount_ngn),
    charge_amount: Number(row.charge_amount),
    payment_method: String(row.payment_method || 'kora'),
    status: String(row.status),
    created_at: String(row.created_at),
  }));
}

export async function verifyWalletDepositReference(
  reference: string,
  userId: string,
  paymentMethod = 'kora',
) {
  await verifyKoraDepositWithRetry(reference, paymentMethod, userId);
  clearPendingDeposit(userId);
}

function isUnpaidKoraError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('not successful')
    || normalized.includes('payment was not')
    || normalized.includes('cancelled')
    || normalized.includes('canceled')
    || normalized.includes('no money was charged')
  );
}

/** Try local pending deposit + server-side payment intents (e.g. user paid but redirect/webhook missed). */
export async function recoverPendingDeposits(userId: string) {
  const credited: string[] = [];
  const stillPending: string[] = [];

  const localPending = getPendingDeposit(userId);
  if (localPending?.reference) {
    try {
      await verifyKoraDepositWithRetry(localPending.reference, localPending.paymentMethod, userId);
      clearPendingDeposit(userId);
      credited.push(localPending.reference);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      if (!isUnpaidKoraError(message)) {
        stillPending.push(localPending.reference);
      }
    }
  }

  const intents = await getPendingWalletPaymentIntents(userId);
  for (const intent of intents) {
    if (credited.includes(intent.reference)) continue;

    try {
      await verifyKoraDepositWithRetry(intent.reference, intent.payment_method, userId);
      clearPendingDeposit(userId);
      credited.push(intent.reference);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      if (!isUnpaidKoraError(message)) {
        stillPending.push(intent.reference);
      }
    }
  }

  return { credited, stillPending };
}

/** Resume a previous deposit session after refresh (Kora or Flutterwave). */
export async function resumePendingDeposit(userId: string) {
  const pending = getPendingDeposit(userId);
  if (!pending?.reference) return false;

  if (pending.provider === 'flutterwave') {
    if (pending.flutterwaveTransactionId) {
      await verifyFlutterwaveDepositWithRetry(
        pending.flutterwaveTransactionId,
        pending.reference,
        pending.paymentMethod,
        userId,
      );
    } else {
      await verifyFlutterwaveDepositByRefWithRetry(pending.reference, pending.paymentMethod, userId);
    }
  } else {
    await verifyKoraDepositWithRetry(pending.reference, pending.paymentMethod, userId);
  }

  clearPendingDeposit(userId);
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

export async function completeKoraRedirect(searchParams: URLSearchParams, userId: string) {
  const reference = searchParams.get('reference');
  if (!reference) return false;

  const pending = getPendingDeposit(userId);
  if (pending && pending.reference !== reference) {
    clearPendingDeposit(userId);
  }

  // Cancel/fail should resolve in one (or two) checks — do not spin for ~30s.
  await verifyKoraDepositWithRetry(
    reference,
    pending?.paymentMethod ?? 'kora',
    userId,
    VERIFY_REDIRECT_RETRY_DELAYS_MS,
  );
  clearPendingDeposit(userId);
  return true;
}

export interface DepositResult {
  status: 'completed' | 'pending' | 'redirected';
}

/** @deprecated Use DepositResult */
export type KoraDepositResult = DepositResult;

export async function startKoraDeposit(params: StartDepositParams): Promise<DepositResult> {
  // Always derive the Kora charge from the wallet credit amount so fee math
  // cannot drift if a caller accidentally passes the charge as `amount`.
  const walletAmount = Math.round(Number(params.walletAmount ?? params.amount));
  const { chargeAmount, chargeCurrency } = getDepositChargeDetails(
    walletAmount,
    params.currency,
  );

  const { data, error } = await supabase.functions.invoke('kora-init', {
    body: {
      amount: chargeAmount,
      currency: chargeCurrency,
      wallet_amount: walletAmount,
      payment_method: params.paymentMethod,
      name: params.name,
    },
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, data));
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  const reference =
    data && typeof data === 'object' && 'reference' in data ? String(data.reference || '').trim() : '';
  const checkoutUrl =
    data && typeof data === 'object' && 'checkout_url' in data
      ? String(data.checkout_url || '').trim()
      : '';

  if (!reference || !checkoutUrl) {
    throw new Error('Kora checkout failed to initialize');
  }

  savePendingDeposit({
    userId: params.userId,
    provider: 'kora',
    reference,
    amount: walletAmount,
    currency: params.currency,
    chargeAmount,
    chargeCurrency,
    walletAmount,
    paymentMethod: params.paymentMethod,
    createdAt: new Date().toISOString(),
    resumeOnLoad: false,
  });

  window.location.assign(checkoutUrl);
  return { status: 'redirected' };
}

export async function startFlutterwaveDeposit(params: StartDepositParams): Promise<DepositResult> {
  void params;
  throw new Error('Flutterwave deposits are temporarily unavailable. Use Kora to add funds.');
}
