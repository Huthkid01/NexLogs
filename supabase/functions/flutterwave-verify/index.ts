import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequestBody {
  transaction_id: number;
  tx_ref: string;
  expected_amount: number;
  expected_currency: string;
  amount_usd: number;
  original_amount: number;
  original_currency: string;
  payment_method: string;
}

const DEFAULT_WALLET_EXCHANGE_RATES: Record<string, number> = {
  NGN: 1500,
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  GHS: 11.67,
  KES: 134.56,
  ZAR: 16.52,
  XOF: 565.62,
  XAF: 565.62,
};

function normalizeWalletExchangeRates(rates?: Record<string, number> | null) {
  return {
    ...DEFAULT_WALLET_EXCHANGE_RATES,
    ...(rates ?? {}),
  };
}

function convertCurrencyToUsd(
  amount: number,
  currency: string,
  rates: Record<string, number>,
) {
  const code = currency.toUpperCase();
  const rate = rates[code];

  if (!rate || rate <= 0 || Number.isNaN(amount) || amount <= 0) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return Math.round((amount / rate) * 1_000_000) / 1_000_000;
}

function hasPaidExpectedAmount(chargedAmount: number, expectedAmount: number) {
  if (chargedAmount + 0.01 >= expectedAmount) return true;
  return chargedAmount >= expectedAmount * 0.985;
}

function resolveCreditAmount(
  verifiedAmount: number,
  verifiedCurrency: string,
  exchangeRates: Record<string, number>,
  expected?: { amount?: number; currency?: string },
) {
  if (expected?.amount && expected.amount > 0 && expected.currency) {
    const expectedCurrency = expected.currency.toUpperCase();
    if (expectedCurrency === verifiedCurrency && hasPaidExpectedAmount(verifiedAmount, expected.amount)) {
      return {
        amount: expected.amount,
        currency: expectedCurrency,
        amountUsd: convertCurrencyToUsd(expected.amount, expectedCurrency, exchangeRates),
      };
    }
  }

  return {
    amount: verifiedAmount,
    currency: verifiedCurrency,
    amountUsd: convertCurrencyToUsd(verifiedAmount, verifiedCurrency, exchangeRates),
  };
}

function extractBearerToken(authHeader: string) {
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function flutterwaveErrorMessage(status: number, payload: { message?: string; status?: string }) {
  const message = payload.message || 'Flutterwave verification failed';
  if (
    status === 401 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid authorization')
  ) {
    return 'Flutterwave secret key is invalid or missing. In Supabase Dashboard → Edge Functions → Secrets, set FLUTTERWAVE_SECRET_KEY to the secret that matches your VITE_FLUTTERWAVE_PUBLIC_KEY (same test or live mode).';
  }
  return message;
}

async function creditWalletDeposit(
  supabase: ReturnType<typeof createClient>,
  params: {
    amountUsd: number;
    verifiedAmount: number;
    verifiedCurrency: string;
    paymentMethod: string;
    txRef: string;
    transactionId: number;
    payment: { amount: unknown; currency: unknown };
  },
) {
  const providerMetadata = {
    provider: 'flutterwave',
    flutterwave_tx_id: String(params.transactionId),
    charged_amount: params.payment.amount,
    charged_currency: params.payment.currency,
  };

  const withExternalRef = await supabase.rpc('wallet_deposit', {
    p_amount_usd: params.amountUsd,
    p_original_amount: params.verifiedAmount,
    p_currency: params.verifiedCurrency,
    p_payment_method: params.paymentMethod,
    p_external_ref: params.txRef,
    p_provider_metadata: providerMetadata,
  });

  if (!withExternalRef.error) {
    return withExternalRef.data as string | null;
  }

  const missingFn =
    withExternalRef.error.code === '42883' ||
    withExternalRef.error.message?.includes('Could not find the function');

  if (!missingFn) {
    throw new Error(withExternalRef.error.message || 'Wallet deposit failed');
  }

  const legacy = await supabase.rpc('wallet_deposit', {
    p_amount_usd: params.amountUsd,
    p_original_amount: params.verifiedAmount,
    p_currency: params.verifiedCurrency,
    p_payment_method: params.paymentMethod,
  });

  if (legacy.error) {
    throw new Error(legacy.error.message || 'Wallet deposit failed');
  }

  return legacy.data as string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment is not configured');
    }

    if (!flutterwaveSecretKey) {
      throw new Error('Flutterwave secret key is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const accessToken = extractBearerToken(authHeader);
    if (!accessToken) {
      throw new Error('Missing authorization header');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.error('auth.getUser failed:', userError?.message);
      throw new Error(userError?.message || 'Unauthorized');
    }

    const body = (await req.json()) as VerifyRequestBody;
    const {
      transaction_id,
      tx_ref,
      payment_method,
      expected_amount,
      expected_currency,
    } = body;

    if (!transaction_id || !tx_ref) {
      throw new Error('Missing payment reference');
    }

    const { data: existingByTxId } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', user.id)
      .contains('metadata', { flutterwave_tx_id: String(transaction_id) })
      .maybeSingle();

    if (existingByTxId) {
      return new Response(JSON.stringify({ ok: true, duplicate: true, deposit_id: existingByTxId.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingByRef } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', user.id)
      .filter('metadata->>tx_ref', 'eq', tx_ref)
      .maybeSingle();

    if (existingByRef) {
      return new Response(JSON.stringify({ ok: true, duplicate: true, deposit_id: existingByRef.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verifyResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const verifyPayload = await verifyResponse.json();

    if (!verifyResponse.ok || verifyPayload.status !== 'success') {
      throw new Error(flutterwaveErrorMessage(verifyResponse.status, verifyPayload));
    }

    const payment = verifyPayload.data;

    if (payment.status !== 'successful') {
      throw new Error('Payment was not successful');
    }

    if (String(payment.tx_ref) !== String(tx_ref)) {
      throw new Error('Transaction reference mismatch');
    }

    const verifiedAmount = Number(payment.amount);
    const verifiedCurrency = String(payment.currency || '').toUpperCase();

    if (!verifiedAmount || verifiedAmount <= 0 || !verifiedCurrency) {
      throw new Error('Invalid payment amount from Flutterwave');
    }

    const { data: walletContent } = await supabase
      .from('site_content_blocks')
      .select('value')
      .eq('key', 'wallet')
      .maybeSingle();

    const walletValue = walletContent?.value as { exchangeRates?: Record<string, number> } | null;
    const exchangeRates = normalizeWalletExchangeRates(walletValue?.exchangeRates);

    const credit = resolveCreditAmount(
      verifiedAmount,
      verifiedCurrency,
      exchangeRates,
      {
        amount: expected_amount,
        currency: expected_currency,
      },
    );

    const depositId = await creditWalletDeposit(supabase, {
      amountUsd: credit.amountUsd,
      verifiedAmount: credit.amount,
      verifiedCurrency: credit.currency,
      paymentMethod: payment_method || 'flutterwave',
      txRef: tx_ref,
      transactionId: transaction_id,
      payment,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        deposit_id: depositId,
        amount_usd: credit.amountUsd,
        original_amount: credit.amount,
        original_currency: credit.currency,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('flutterwave-verify failed:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Verification failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
