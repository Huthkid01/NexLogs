import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KORA_API_BASE = 'https://api.korapay.com/merchant/api/v1';

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

interface VerifyRequestBody {
  reference: string;
  payment_method?: string;
}

interface KoraChargeData {
  reference?: string;
  payment_reference?: string;
  status?: string;
  transaction_status?: string;
  amount?: string | number;
  amount_paid?: string | number;
  amount_accepted?: string | number;
  currency?: string;
}

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

  return Math.round((amount / rate) * 100) / 100;
}

function extractBearerToken(authHeader: string) {
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function koraErrorMessage(status: number, payload: { message?: string }) {
  const message = payload.message || 'Kora verification failed';
  if (status === 401 || message.toLowerCase().includes('unauthorized')) {
    return 'Kora secret key is invalid or missing. Set KORA_SECRET_KEY in Supabase Edge Function secrets to match your live/test mode.';
  }
  return message;
}

function isSuccessfulCharge(payment: KoraChargeData) {
  const status = String(payment.status ?? '').toLowerCase();
  const txStatus = String(payment.transaction_status ?? '').toLowerCase();
  return (
    status === 'success' ||
    txStatus === 'success' ||
    txStatus === 'overpaid'
  );
}

function resolveMerchantReference(clientReference: string, payment: KoraChargeData) {
  const merchantRef = String(payment.payment_reference ?? '').trim();
  if (merchantRef) return merchantRef;
  return clientReference.trim();
}

function resolvePaidAmount(payment: KoraChargeData) {
  const raw = payment.amount_accepted ?? payment.amount_paid ?? payment.amount;
  const amount = Number(raw);
  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    throw new Error('Invalid payment amount from Kora');
  }
  return amount;
}

async function creditWalletDeposit(
  supabase: ReturnType<typeof createClient>,
  params: {
    amountUsd: number;
    verifiedAmount: number;
    verifiedCurrency: string;
    paymentMethod: string;
    reference: string;
    payment: KoraChargeData;
  },
) {
  const providerMetadata = {
    provider: 'kora',
    kora_reference: params.payment.reference ?? params.reference,
    charged_amount: params.payment.amount_paid ?? params.payment.amount,
    charged_currency: params.payment.currency,
  };

  const withExternalRef = await supabase.rpc('wallet_deposit', {
    p_amount_usd: params.amountUsd,
    p_original_amount: params.verifiedAmount,
    p_currency: params.verifiedCurrency,
    p_payment_method: params.paymentMethod,
    p_external_ref: params.reference,
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
    const koraSecretKey = Deno.env.get('KORA_SECRET_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment is not configured');
    }

    if (!koraSecretKey) {
      throw new Error('Kora secret key is not configured');
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
    const { reference, payment_method } = body;

    if (!reference?.trim()) {
      throw new Error('Missing payment reference');
    }

    const clientReference = reference.trim();

    const verifyResponse = await fetch(
      `${KORA_API_BASE}/charges/${encodeURIComponent(clientReference)}`,
      {
        headers: {
          Authorization: `Bearer ${koraSecretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const verifyPayload = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyPayload.status) {
      throw new Error(koraErrorMessage(verifyResponse.status, verifyPayload));
    }

    const payment = verifyPayload.data as KoraChargeData;

    if (!isSuccessfulCharge(payment)) {
      throw new Error('Payment was not successful');
    }

    const merchantReference = resolveMerchantReference(clientReference, payment);

    const { data: existingByRef } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', user.id)
      .filter('metadata->>tx_ref', 'eq', merchantReference)
      .maybeSingle();

    if (existingByRef) {
      return new Response(JSON.stringify({ ok: true, duplicate: true, deposit_id: existingByRef.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verifiedAmount = resolvePaidAmount(payment);
    const verifiedCurrency = String(payment.currency || 'NGN').toUpperCase();

    const { data: walletContent } = await supabase
      .from('site_content_blocks')
      .select('value')
      .eq('key', 'wallet')
      .maybeSingle();

    const walletValue = walletContent?.value as { exchangeRates?: Record<string, number> } | null;
    const exchangeRates = normalizeWalletExchangeRates(walletValue?.exchangeRates);
    const computedAmountUsd = convertCurrencyToUsd(
      verifiedAmount,
      verifiedCurrency,
      exchangeRates,
    );

    const depositId = await creditWalletDeposit(supabase, {
      amountUsd: computedAmountUsd,
      verifiedAmount,
      verifiedCurrency,
      paymentMethod: payment_method || 'kora',
      reference: merchantReference,
      payment,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        deposit_id: depositId,
        amount_usd: computedAmountUsd,
        original_amount: verifiedAmount,
        original_currency: verifiedCurrency,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('kora-verify failed:', error);
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
