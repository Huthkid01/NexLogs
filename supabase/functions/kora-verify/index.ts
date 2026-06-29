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
  expected_amount?: number;
  expected_currency?: string;
  expected_amount_usd?: number;
  charge_amount?: number;
  charge_currency?: string;
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
  metadata?: Record<string, unknown>;
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

function readMetadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const raw = metadata?.[key];
  const value = Number(raw);
  return value > 0 && !Number.isNaN(value) ? value : undefined;
}

function readMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const raw = metadata?.[key];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function resolveExpectedFromBodyOrMetadata(
  body: VerifyRequestBody,
  payment: KoraChargeData,
) {
  const metadata = payment.metadata;
  const amount = body.expected_amount ?? readMetadataNumber(metadata, 'wallet_amount');
  const currency = body.expected_currency ?? readMetadataString(metadata, 'wallet_currency');
  const amountUsd = body.expected_amount_usd ?? readMetadataNumber(metadata, 'wallet_amount_usd');
  const chargeAmount = body.charge_amount ?? amount;
  const chargeCurrency = body.charge_currency ?? currency;

  if (!amount || !currency) {
    return undefined;
  }

  return {
    amount,
    currency,
    amountUsd,
    chargeAmount,
    chargeCurrency,
  };
}

function resolveChargedAmount(payment: KoraChargeData) {
  const raw = payment.amount ?? payment.amount_paid ?? payment.amount_accepted;
  const amount = Number(raw);
  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    throw new Error('Invalid payment amount from Kora');
  }
  return amount;
}

function resolveCreditAmount(
  payment: KoraChargeData,
  exchangeRates: Record<string, number>,
  expected?: {
    amount?: number;
    currency?: string;
    amountUsd?: number;
    chargeAmount?: number;
    chargeCurrency?: string;
  },
) {
  const chargedAmount = resolveChargedAmount(payment);
  const chargedCurrency = String(payment.currency || 'NGN').toUpperCase();

  if (expected?.amount && expected.amount > 0 && expected.currency) {
    const expectedCurrency = expected.currency.toUpperCase();
    const chargeCurrency = (expected.chargeCurrency ?? expectedCurrency).toUpperCase();

    if (expectedCurrency === chargedCurrency || chargeCurrency === chargedCurrency) {
      // Credit the amount the user entered only if Kora confirms they paid at least that much.
      // Never trust client-only fields without matching Kora charge amount.
      const paidEnough = chargedAmount + 0.01 >= expected.amount;
      if (paidEnough) {
        const amountUsd =
          expected.amountUsd && expected.amountUsd > 0
            ? Math.round(expected.amountUsd * 100) / 100
            : convertCurrencyToUsd(expected.amount, expectedCurrency, exchangeRates);

        return {
          amount: expected.amount,
          currency: expectedCurrency,
          amountUsd,
        };
      }
    }
  }

  return {
    amount: chargedAmount,
    currency: chargedCurrency,
    amountUsd: convertCurrencyToUsd(chargedAmount, chargedCurrency, exchangeRates),
  };
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

    const { data: walletContent } = await supabase
      .from('site_content_blocks')
      .select('value')
      .eq('key', 'wallet')
      .maybeSingle();

    const walletValue = walletContent?.value as { exchangeRates?: Record<string, number> } | null;
    const exchangeRates = normalizeWalletExchangeRates(walletValue?.exchangeRates);

    const credit = resolveCreditAmount(
      payment,
      exchangeRates,
      resolveExpectedFromBodyOrMetadata(body, payment),
    );

    const depositId = await creditWalletDeposit(supabase, {
      amountUsd: credit.amountUsd,
      verifiedAmount: credit.amount,
      verifiedCurrency: credit.currency,
      paymentMethod: payment_method || 'kora',
      reference: merchantReference,
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
