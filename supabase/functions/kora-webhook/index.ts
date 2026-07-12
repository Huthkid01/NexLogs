import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  isSuccessfulCharge,
  isValidKoraWebhookSignature,
  resolveChargedAmount,
  resolveCreditAmount,
  resolveMerchantReference,
  type KoraChargeData,
} from '../_shared/kora-payment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-korapay-signature',
};

interface KoraWebhookPayload {
  event?: string;
  data?: KoraChargeData;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const koraSecretKey = Deno.env.get('KORA_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment is not configured');
    }
    if (!koraSecretKey) {
      throw new Error('Kora secret key is not configured');
    }

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody) as KoraWebhookPayload;
    const signature = req.headers.get('x-korapay-signature');
    const payment = payload.data;

    const validSignature = await isValidKoraWebhookSignature(signature, payment, koraSecretKey);
    if (!validSignature) {
      console.warn('kora-webhook ignored invalid signature');
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.event !== 'charge.success' || !payment || !isSuccessfulCharge(payment)) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const merchantReference = resolveMerchantReference(String(payment.reference ?? ''), payment);
    if (!merchantReference) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: intent, error: intentError } = await admin
      .from('wallet_payment_intents')
      .select('id, expected_amount_ngn, payment_method, wallet_transaction_id')
      .eq('provider', 'kora')
      .eq('reference', merchantReference)
      .maybeSingle();

    if (intentError) {
      throw new Error(intentError.message || 'Failed to load payment intent');
    }
    if (!intent) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (intent.wallet_transaction_id) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountNgn = resolveCreditAmount(payment, Number(intent.expected_amount_ngn));
    const originalAmount = resolveChargedAmount(payment);
    const originalCurrency = String(payment.currency || 'NGN').toUpperCase();

    const { data: depositId, error: completeError } = await admin.rpc('complete_wallet_payment_intent', {
      p_provider: 'kora',
      p_reference: merchantReference,
      p_verified_amount_ngn: amountNgn,
      p_original_amount: originalAmount,
      p_original_currency: originalCurrency,
      p_payment_method: String(payment.payment_method || intent.payment_method || 'kora'),
      p_provider_charge_reference: String(payment.reference || ''),
      p_provider_metadata: {
        provider: 'kora',
        kora_reference: payment.reference ?? null,
        charged_amount: payment.amount_paid ?? payment.amount_accepted ?? payment.amount ?? null,
        charged_currency: payment.currency ?? 'NGN',
        transaction_status: payment.transaction_status ?? payment.status ?? null,
        source: 'kora_webhook',
      },
    });

    if (completeError) {
      throw new Error(completeError.message || 'Failed to complete payment intent');
    }

    return new Response(JSON.stringify({ ok: true, deposit_id: depositId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('kora-webhook failed:', error);
    const message = error instanceof Error ? error.message : 'Webhook failed';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
