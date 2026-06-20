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
  params: StartDepositParams,
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
    throw new Error(error.message || 'Payment verification failed');
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  return data;
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

  return new Promise<void>((resolve, reject) => {
    let settled = false;

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
      redirect_url: `${window.location.origin}/add-funds?status=success`,
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

            await verifyFlutterwaveDeposit(response, params, txRef);
            finish(() => resolve());
          } catch (err) {
            finish(() => reject(err instanceof Error ? err : new Error('Payment verification failed')));
          }
        })();
      },
      onclose: () => {
        finish(() => reject(new Error('Payment cancelled')));
      },
    });
  });
}
