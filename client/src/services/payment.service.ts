import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  createDepositTxRef,
  getFlutterwavePublicKey,
  isFlutterwaveConfigured,
} from '@/lib/flutterwave-config';
import type { FlutterwaveCheckoutResponse } from '@/types/flutterwave';

export interface StartDepositParams {
  userId: string;
  email: string;
  name?: string;
  amount: number;
  currency: string;
  amountUsd: number;
  paymentMethod: string;
}

interface PendingDeposit {
  txRef: string;
  amount: number;
  currency: string;
  amountUsd: number;
  paymentMethod: string;
}

const PENDING_DEPOSIT_KEY = 'nexlogs_pending_deposit';

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

function loadFlutterwaveScript() {
  if (window.FlutterwaveCheckout) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-flutterwave-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Flutterwave')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.dataset.flutterwaveCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Flutterwave checkout'));
    document.body.appendChild(script);
  });
}

async function verifyFlutterwaveDeposit(
  response: FlutterwaveCheckoutResponse,
  params: Pick<StartDepositParams, 'amount' | 'currency' | 'amountUsd' | 'paymentMethod'>,
  txRef: string,
) {
  const { data, error } = await supabase.functions.invoke('flutterwave-verify', {
    body: {
      transaction_id: response.transaction_id,
      tx_ref: txRef,
      expected_amount: params.amount,
      expected_currency: params.currency,
      amount_usd: params.amountUsd,
      original_amount: params.amount,
      original_currency: params.currency,
      payment_method: params.paymentMethod,
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

export async function completeFlutterwaveRedirect(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const txRef = searchParams.get('tx_ref');
  const transactionId = searchParams.get('transaction_id');

  if (!txRef || !transactionId) return false;
  if (status !== 'successful' && status !== 'completed') return false;

  const pending = getPendingDeposit();
  if (pending && pending.txRef !== txRef) {
    throw new Error('Payment session expired. If you were charged, contact support with reference: ' + txRef);
  }

  await verifyFlutterwaveDeposit(
    {
      status: 'successful',
      transaction_id: Number(transactionId),
      tx_ref: txRef,
    },
    pending ?? {
      amount: 0,
      currency: 'NGN',
      amountUsd: 0,
      paymentMethod: 'flutterwave',
    },
    txRef,
  );

  clearPendingDeposit();
  return true;
}

export async function startFlutterwaveDeposit(params: StartDepositParams) {
  if (!isFlutterwaveConfigured()) {
    throw new Error('Flutterwave is not configured. Add VITE_FLUTTERWAVE_PUBLIC_KEY to your environment.');
  }

  await loadFlutterwaveScript();

  if (!window.FlutterwaveCheckout) {
    throw new Error('Flutterwave checkout failed to initialize');
  }

  const publicKey = getFlutterwavePublicKey()!;
  const txRef = createDepositTxRef(params.userId);

  savePendingDeposit({
    txRef,
    amount: params.amount,
    currency: params.currency,
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

    window.FlutterwaveCheckout!({
      public_key: publicKey,
      tx_ref: txRef,
      amount: params.amount,
      currency: params.currency,
      payment_options: 'card,banktransfer,ussd',
      redirect_url: `${window.location.origin}/add-funds`,
      customer: {
        email: params.email,
        name: params.name || params.email,
      },
      customizations: {
        title: 'Nexlogs',
        description: 'Add funds to your wallet',
      },
      callback: (response) => {
        void (async () => {
          try {
            if (response.status !== 'successful') {
              finish(() => reject(new Error('Payment was not successful')));
              return;
            }

            verifying = true;
            await verifyFlutterwaveDeposit(response, params, txRef);
            clearPendingDeposit();
            finish(() => resolve());
          } catch (err) {
            finish(() => reject(err instanceof Error ? err : new Error('Payment verification failed')));
          } finally {
            verifying = false;
          }
        })();
      },
      onclose: () => {
        setTimeout(() => {
          if (!settled && !verifying) {
            finish(() => reject(new Error('Payment cancelled')));
          }
        }, 5000);
      },
    });
  });
}
