import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';
import { buildPurchaseEmail, buildWalletDepositEmail } from './templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-email-webhook-secret',
};

function toError(error: unknown, fallback: string) {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(fallback);
}

function isRdpSlug(slug: string | null | undefined) {
  return Boolean(slug?.includes('-rdp-'));
}

type PurchaseEmailProduct = {
  title: string;
  slug: string;
  niche?: string | null;
  category?: { slug?: string | null } | { slug?: string | null }[] | null;
};

function isTelegramProduct(product: PurchaseEmailProduct | null | undefined) {
  if (!product) return false;
  const category = Array.isArray(product.category) ? product.category[0] : product.category;
  if (category?.slug === 'telegram') return true;
  if (product.niche?.trim().toLowerCase() === 'telegram') return true;
  if (product.slug.includes('telegram')) return true;
  if (product.title.toUpperCase().includes('TELEGRAM')) return true;
  return false;
}

function resolvePurchaseFulfillmentType(items: Array<{ product: unknown }>) {
  const products = items
    .map((item) => normalizeProduct(item.product) as PurchaseEmailProduct | null)
    .filter(Boolean) as PurchaseEmailProduct[];

  if (products.some(isTelegramProduct)) return 'telegram';
  if (products.some((product) => isRdpSlug(product.slug))) return 'rdp';
  return 'standard';
}

function normalizeProduct(product: unknown) {
  if (!product) return null;
  if (Array.isArray(product)) return product[0] ?? null;
  return product as PurchaseEmailProduct;
}

function formatNgn(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

async function sendViaSmtp(
  input: { to: string; subject: string; html: string; text?: string },
  options: { host: string; port: number; secure: boolean; user: string; pass: string; from: string },
) {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.user,
      pass: options.pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  await new Promise<void>((resolve, reject) => {
    transport.sendMail(
      {
        from: options.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

async function sendMail(input: { to: string; subject: string; html: string; text?: string }) {
  const host = Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com';
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const fromName = Deno.env.get('EMAIL_FROM_NAME') || Deno.env.get('APP_NAME') || 'Nexlogs';
  const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || user;

  if (!user || !pass || !fromAddress) {
    throw new Error('SMTP_USER, SMTP_PASS, and EMAIL_FROM_ADDRESS must be set in Supabase Edge Function secrets');
  }

  const from = `"${fromName}" <${fromAddress}>`;
  const configuredPort = Number(Deno.env.get('SMTP_PORT') || 465);
  const configuredSecure = Deno.env.get('SMTP_SECURE') !== 'false';

  const attempts = [
    { port: 465, secure: true },
    { port: 587, secure: false },
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      await sendViaSmtp(input, {
        host,
        port: attempt.port,
        secure: attempt.secure,
        user,
        pass,
        from,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(message);
      console.error(`[send-transactional-email] SMTP ${host}:${attempt.port} secure=${attempt.secure} failed:`, message);
    }
  }

  throw lastError ?? new Error('SMTP send failed');
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
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is missing. Run: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
      );
    }

    console.log('[send-transactional-email] start', { type, hasSmtpUser: Boolean(Deno.env.get('SMTP_USER')) });

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
            product:products(title, slug, niche, category:categories(slug))
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw toError(orderError, 'Order not found');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', order.user_id)
        .single();

      if (profileError || !profile?.email) throw toError(profileError, 'Buyer profile not found');

      console.log('[send-transactional-email] purchase email to', profile.email);

      const items = order.order_items ?? [];
      const productLines = items.map((item: {
        quantity: number;
        price: number;
        product: { title: string; slug: string } | { title: string; slug: string }[] | null;
      }) => {
        const product = normalizeProduct(item.product);
        return `${product?.title ?? 'Product'} x${item.quantity} — ${formatNgn(item.price)}`;
      });

      const fulfillmentType = resolvePurchaseFulfillmentType(items);

      const email = buildPurchaseEmail({
        appName,
        appUrl,
        fullName: profile.full_name || profile.email.split('@')[0],
        orderNumber: order.order_number || order.id,
        productLines,
        totalAmount: Number(order.total_amount),
        fulfillmentType,
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

      if (txError || !tx) throw toError(txError, 'Transaction not found');
      if (tx.kind !== 'deposit' || tx.status !== 'completed') {
        throw new Error('Transaction is not a completed deposit');
      }

      const [{ data: profile, error: profileError }, { data: wallet, error: walletError }] =
        await Promise.all([
          supabase.from('profiles').select('full_name, email').eq('id', tx.user_id).single(),
          supabase.from('wallets').select('balance').eq('user_id', tx.user_id).single(),
        ]);

      if (profileError || !profile?.email) throw toError(profileError, 'Profile not found');
      if (walletError || !wallet) throw toError(walletError, 'Wallet not found');

      console.log('[send-transactional-email] wallet email to', profile.email, 'amount', tx.amount);

      const email = buildWalletDepositEmail({
        appName,
        appUrl,
        fullName: profile.full_name || profile.email.split('@')[0],
        amountNgn: Number(tx.amount),
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
    return new Response(
      JSON.stringify({
        error: message,
        hint: 'Check Edge Function secrets: SMTP_USER=support@nexlogs.store and matching app password.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
