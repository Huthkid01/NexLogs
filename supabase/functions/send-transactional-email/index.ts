import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';
import { buildPurchaseEmail, buildWalletDepositEmail } from './templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-email-webhook-secret',
};

type EmailType = 'purchase' | 'wallet_deposit';

function isRdpSlug(slug: string | null | undefined) {
  return Boolean(slug?.includes('-rdp-'));
}

function normalizeProduct(product: unknown) {
  if (!product) return null;
  if (Array.isArray(product)) return product[0] ?? null;
  return product as { title: string; slug: string };
}

async function sendMail(input: { to: string; subject: string; html: string; text?: string }) {
  const host = Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com';
  const port = Number(Deno.env.get('SMTP_PORT') || 465);
  const secure = Deno.env.get('SMTP_SECURE') !== 'false';
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const fromName = Deno.env.get('EMAIL_FROM_NAME') || Deno.env.get('APP_NAME') || 'Nexlogs';
  const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || user;

  if (!user || !pass || !fromAddress) {
    throw new Error('SMTP_USER, SMTP_PASS, and EMAIL_FROM_ADDRESS must be set in Supabase Edge Function secrets');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get('EMAIL_WEBHOOK_SECRET');
    if (!expectedSecret) {
      throw new Error('EMAIL_WEBHOOK_SECRET is missing in Supabase Edge Function secrets');
    }

    const providedSecret = req.headers.get('x-email-webhook-secret');
    if (providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      type?: EmailType;
      order_id?: string;
      transaction_id?: string;
    };

    const type = body.type;
    if (type !== 'purchase' && type !== 'wallet_deposit') {
      throw new Error('Unsupported or missing email type');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service role key is unavailable');
    }

    const appName = Deno.env.get('APP_NAME') || 'Nexlogs';
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || 'https://nexlogs.store').replace(
      /\/$/,
      '',
    );

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (type === 'purchase') {
      const orderId = body.order_id?.trim();
      if (!orderId) throw new Error('Missing order_id');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          user_id,
          total_amount,
          status,
          order_items(
            quantity,
            price,
            product:products(title, slug)
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw orderError ?? new Error('Order not found');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', order.user_id)
        .single();

      if (profileError || !profile?.email) throw profileError ?? new Error('Buyer profile not found');

      const items = order.order_items ?? [];
      const productLines = items.map((item: {
        quantity: number;
        price: number;
        product: { title: string; slug: string } | { title: string; slug: string }[] | null;
      }) => {
        const product = normalizeProduct(item.product);
        return `${product?.title ?? 'Product'} x${item.quantity} — $${Number(item.price).toFixed(2)}`;
      });

      const pendingRdp =
        items.some((item: { product: unknown }) => isRdpSlug(normalizeProduct(item.product)?.slug)) &&
        order.status === 'processing';

      const email = buildPurchaseEmail({
        appName,
        appUrl,
        fullName: profile.full_name || profile.email.split('@')[0],
        orderNumber: order.order_number || order.id,
        productLines,
        totalAmount: Number(order.total_amount),
        pendingRdp,
      });

      await sendMail({ to: profile.email, ...email });
    }

    if (type === 'wallet_deposit') {
      const transactionId = body.transaction_id?.trim();
      if (!transactionId) throw new Error('Missing transaction_id');

      const { data: tx, error: txError } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, ref, kind, status')
        .eq('id', transactionId)
        .single();

      if (txError || !tx) throw txError ?? new Error('Transaction not found');
      if (tx.kind !== 'deposit' || tx.status !== 'completed') {
        throw new Error('Transaction is not a completed deposit');
      }

      const [{ data: profile, error: profileError }, { data: wallet, error: walletError }] =
        await Promise.all([
          supabase.from('profiles').select('full_name, email').eq('id', tx.user_id).single(),
          supabase.from('wallets').select('balance').eq('user_id', tx.user_id).single(),
        ]);

      if (profileError || !profile?.email) throw profileError ?? new Error('Profile not found');
      if (walletError || !wallet) throw walletError ?? new Error('Wallet not found');

      const email = buildWalletDepositEmail({
        appName,
        appUrl,
        fullName: profile.full_name || profile.email.split('@')[0],
        amountUsd: Number(tx.amount),
        newBalance: Number(wallet.balance),
        reference: tx.ref || tx.id,
      });

      await sendMail({ to: profile.email, ...email });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send email failed';
    console.error('[send-transactional-email]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
