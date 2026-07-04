import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  extractBearerToken,
  KORA_API_BASE,
  koraErrorMessage,
  type KoraInitializeResponse,
} from '../_shared/kora-payment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitRequestBody {
  amount: number;
  currency?: string;
  wallet_amount?: number;
  payment_method?: string;
  name?: string;
}

function createKoraMerchantReference() {
  return `KORA-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function normalizeAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid payment amount');
  }
  return Math.round(amount);
}

function resolveAppUrl(req: Request) {
  const configured = Deno.env.get('APP_URL')?.trim();
  if (configured) return configured;
  const origin = req.headers.get('origin')?.trim();
  if (origin) return origin;
  throw new Error('APP_URL is not configured');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const accessToken = extractBearerToken(authHeader);
    if (!accessToken) {
      throw new Error('Missing authorization header');
    }

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);
    if (userError || !user) {
      throw new Error(userError?.message || 'Unauthorized');
    }
    if (!user.email) {
      throw new Error('Your account email is required for payment');
    }

    const body = (await req.json()) as InitRequestBody;
    const amountNgn = normalizeAmount(body.wallet_amount ?? body.amount);
    const chargeAmount = normalizeAmount(body.amount);
    const chargeCurrency = String(body.currency || 'NGN').toUpperCase();
    if (chargeCurrency !== 'NGN') {
      throw new Error('Only NGN wallet deposits are supported');
    }

    const reference = createKoraMerchantReference();
    const appUrl = resolveAppUrl(req);
    const redirectUrl = new URL('/add-funds', appUrl).toString();
    const notificationUrl = `${supabaseUrl}/functions/v1/kora-webhook`;
    const customerName =
      body.name?.trim() ||
      String(user.user_metadata?.full_name || user.user_metadata?.name || user.email).trim();

    const { error: intentError } = await admin.from('wallet_payment_intents').insert({
      user_id: user.id,
      provider: 'kora',
      reference,
      expected_amount_ngn: amountNgn,
      charge_amount: chargeAmount,
      charge_currency: chargeCurrency,
      payment_method: body.payment_method?.trim() || 'kora_card',
      metadata: {
        source: 'nexlogs-wallet',
        customer_email: user.email,
      },
    });

    if (intentError) {
      throw new Error(intentError.message || 'Failed to create payment intent');
    }

    const initResponse = await fetch(`${KORA_API_BASE}/charges/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${koraSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: chargeAmount,
        currency: chargeCurrency,
        reference,
        redirect_url: redirectUrl,
        notification_url: notificationUrl,
        narration: 'Add funds to your Nexlogs wallet',
        channels: ['card', 'bank_transfer', 'pay_with_bank'],
        default_channel: 'card',
        customer: {
          email: user.email,
          name: customerName,
        },
        metadata: {
          source: 'nexlogs-wallet',
          user_id: user.id,
          wallet_amount_ngn: String(amountNgn),
        },
      }),
    });

    const initPayload = (await initResponse.json()) as KoraInitializeResponse & { message?: string };

    if (!initResponse.ok || !initPayload.status || !initPayload.data?.checkout_url) {
      await admin
        .from('wallet_payment_intents')
        .update({
          status: 'failed',
          metadata: {
            source: 'nexlogs-wallet',
            customer_email: user.email,
            init_error: initPayload.message || 'Kora initialize failed',
          },
        })
        .eq('provider', 'kora')
        .eq('reference', reference);

      throw new Error(koraErrorMessage(initResponse.status, initPayload));
    }

    await admin
      .from('wallet_payment_intents')
      .update({
        metadata: {
          source: 'nexlogs-wallet',
          customer_email: user.email,
          checkout_url: initPayload.data.checkout_url,
        },
        provider_charge_reference: initPayload.data.reference ?? null,
      })
      .eq('provider', 'kora')
      .eq('reference', reference);

    return new Response(
      JSON.stringify({
        ok: true,
        reference,
        checkout_url: initPayload.data.checkout_url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('kora-init failed:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Unable to start payment';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
