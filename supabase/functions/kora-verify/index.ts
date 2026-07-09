import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  extractBearerToken,
  isSuccessfulCharge,
  KORA_API_BASE,
  koraErrorMessage,
  resolveChargedAmount,
  resolveCreditAmount,
  resolveMerchantReference,
  type KoraChargeData,
} from '../_shared/kora-payment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequestBody {
  reference: string;
  payment_method?: string;
  expected_amount?: number;
  expected_currency?: string;
  wallet_amount?: number;
  charge_amount?: number;
  charge_currency?: string;
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
  const walletAmount =
    body.wallet_amount ??
    readMetadataNumber(metadata, 'wallet_amount_ngn') ??
    readMetadataNumber(metadata, 'wallet_amount');
  const chargeAmount = body.charge_amount ?? amount;
  const chargeCurrency = body.charge_currency ?? currency;

  if (!amount || !currency) {
    return undefined;
  }

  return {
    amount,
    currency,
    walletAmount,
    chargeAmount,
    chargeCurrency,
  };
}

function resolveLegacyCreditAmount(
  payment: KoraChargeData,
  expected?: {
    amount?: number;
    currency?: string;
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
      if (chargedAmount + 0.01 >= expected.amount || chargedAmount >= expected.amount * 0.985) {
        return {
          amount: expected.amount,
          currency: expectedCurrency,
          walletAmount: expected.amount,
        };
      }
    }
  }

  return {
    amount: chargedAmount,
    currency: chargedCurrency,
    walletAmount: chargedAmount,
  };
}

async function creditWalletDeposit(
  supabase: ReturnType<typeof createClient>,
  params: {
    amountNgn: number;
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
    p_amount_usd: params.amountNgn,
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
    p_amount_usd: params.amountNgn,
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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const koraSecretKey = Deno.env.get('KORA_SECRET_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment is not configured');
    }

    if (!koraSecretKey) {
      throw new Error('Kora secret key is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const adminAsUser = createClient(supabaseUrl, supabaseServiceRoleKey, {
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

    const { data: intent, error: intentError } = await admin
      .from('wallet_payment_intents')
      .select('user_id, expected_amount_ngn, payment_method, wallet_transaction_id')
      .eq('provider', 'kora')
      .eq('reference', merchantReference)
      .maybeSingle();

    if (intentError) {
      throw new Error(intentError.message || 'Failed to load payment intent');
    }

    let depositId: string | null = null;
    let creditedAmount = resolveChargedAmount(payment);
    let creditedCurrency = String(payment.currency || 'NGN').toUpperCase();
    let walletAmount = creditedAmount;

    if (intent) {
      if (intent.user_id !== user.id) {
        throw new Error('This payment does not belong to the current account');
      }

      if (intent.wallet_transaction_id) {
        return new Response(
          JSON.stringify({ ok: true, duplicate: true, deposit_id: intent.wallet_transaction_id }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      walletAmount = resolveCreditAmount(payment, Number(intent.expected_amount_ngn));
      creditedAmount = resolveChargedAmount(payment);
      creditedCurrency = String(payment.currency || 'NGN').toUpperCase();

      const { data: completedId, error: completeError } = await admin.rpc(
        'complete_wallet_payment_intent',
        {
          p_provider: 'kora',
          p_reference: merchantReference,
          p_verified_amount_ngn: walletAmount,
          p_original_amount: creditedAmount,
          p_original_currency: creditedCurrency,
          p_payment_method: payment_method || payment.payment_method || intent.payment_method || 'kora',
          p_provider_charge_reference: String(payment.reference || ''),
          p_provider_metadata: {
            provider: 'kora',
            kora_reference: payment.reference ?? null,
            charged_amount: payment.amount_paid ?? payment.amount_accepted ?? payment.amount ?? null,
            charged_currency: payment.currency ?? 'NGN',
            transaction_status: payment.transaction_status ?? payment.status ?? null,
            source: 'kora_verify',
          },
        },
      );

      if (completeError) {
        throw new Error(completeError.message || 'Wallet deposit failed');
      }

      depositId = (completedId as string | null) ?? null;
    } else {
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

      const credit = resolveLegacyCreditAmount(
        payment,
        resolveExpectedFromBodyOrMetadata(body, payment),
      );
      walletAmount = credit.walletAmount;
      creditedAmount = credit.amount;
      creditedCurrency = credit.currency;

      depositId = await creditWalletDeposit(adminAsUser, {
        amountNgn: credit.walletAmount,
        verifiedAmount: credit.amount,
        verifiedCurrency: credit.currency,
        paymentMethod: payment_method || 'kora',
        reference: merchantReference,
        payment,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deposit_id: depositId,
        amount_ngn: walletAmount,
        original_amount: creditedAmount,
        original_currency: creditedCurrency,
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
