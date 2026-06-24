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

  return Math.round((amount / rate) * 100) / 100;
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = (await req.json()) as VerifyRequestBody;
    const {
      transaction_id,
      tx_ref,
      payment_method,
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
      throw new Error(verifyPayload.message || 'Flutterwave verification failed');
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
    const computedAmountUsd = convertCurrencyToUsd(
      verifiedAmount,
      verifiedCurrency,
      exchangeRates,
    );

    const { data: depositId, error: depositError } = await supabase.rpc('wallet_deposit', {
      p_amount_usd: computedAmountUsd,
      p_original_amount: verifiedAmount,
      p_currency: verifiedCurrency,
      p_payment_method: payment_method || 'flutterwave',
    });

    if (depositError) {
      throw depositError;
    }

    if (depositId) {
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        await supabaseAdmin
          .from('wallet_transactions')
          .update({
            payment_method: 'flutterwave',
            metadata: {
              provider: 'flutterwave',
              flutterwave_tx_id: String(transaction_id),
              tx_ref,
              charged_amount: payment.amount,
              charged_currency: payment.currency,
            },
          } as never)
          .eq('id', depositId)
          .eq('user_id', user.id);
      }
    }

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
    console.error('flutterwave-verify failed:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
