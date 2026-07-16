import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-webhook-secret',
};

interface OrderItemRow {
  quantity: number;
  price: number;
  delivered_details: string | null;
  product: {
    title: string;
    slug: string;
    niche: string | null;
    platform: string;
  } | {
    title: string;
    slug: string;
    niche: string | null;
    platform: string;
  }[] | null;
}

interface OrderRow {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_items: OrderItemRow[];
}

interface SmsNumberOrderRow {
  id: string;
  user_id: string;
  phone_number: string;
  country_name: string | null;
  country_id: string;
  service_name: string | null;
  service_id: string;
  status: string;
  verification_code: string | null;
  charged_ngn: number;
  cost_usd: number;
  expires_at: string | null;
  smspool_order_id: string;
  created_at: string;
}

interface WalletTransactionRow {
  id: string;
  user_id: string;
  ref: string;
  kind: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatNgn(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function isRdpSlug(slug: string | null | undefined) {
  return Boolean(slug?.includes('-rdp-'));
}

function normalizeProduct(item: OrderItemRow) {
  if (!item.product) return null;
  return Array.isArray(item.product) ? item.product[0] ?? null : item.product;
}

function buildTelegramMessage(
  order: OrderRow,
  buyer: { full_name: string; email: string },
  adminOrdersUrl: string,
) {
  const items = order.order_items ?? [];
  const hasRdp = items.some((item) => isRdpSlug(normalizeProduct(item)?.slug));
  const productLines = items.map((item) => {
    const product = normalizeProduct(item);
    const title = product?.title ?? 'Unknown product';
    const slug = product?.slug ?? '';
    const type = isRdpSlug(slug) ? 'RDP' : (product?.niche ?? product?.platform ?? 'Product');
    return `• ${escapeHtml(title)} (${escapeHtml(type)}) x${item.quantity} — ${formatNgn(item.price)}`;
  });

  const header = hasRdp
    ? '🖥️ <b>New RDP purchase — action required</b>'
    : '🛒 <b>New purchase on Nexlogs</b>';

  const actionLine = hasRdp
    ? '\n\n⚠️ Paste RDP credentials for the buyer in Admin → Orders.'
    : '';

  return [
    header,
    '',
    `<b>Buyer:</b> ${escapeHtml(buyer.full_name)}`,
    `<b>Email:</b> ${escapeHtml(buyer.email)}`,
    `<b>Total:</b> ${formatNgn(order.total_amount)}`,
    `<b>Status:</b> ${escapeHtml(order.status)} / ${escapeHtml(order.payment_status)}`,
    `<b>Order ID:</b> <code>${escapeHtml(order.id)}</code>`,
    '',
    '<b>Items:</b>',
    productLines.join('\n') || '• No items found',
    actionLine,
    '',
    `<a href="${adminOrdersUrl}">Open Admin Orders</a>`,
  ].join('\n');
}

function buildSmsOrderTelegramMessage(
  order: SmsNumberOrderRow,
  buyer: { full_name: string; email: string },
  adminSmsUrl: string,
) {
  const country = order.country_name?.trim() || order.country_id;
  const service = order.service_name?.trim() || order.service_id;
  const expiresLine = order.expires_at
    ? `<b>Expires:</b> ${escapeHtml(new Date(order.expires_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }))}`
    : null;

  const code = order.verification_code?.trim() || '';

  return [
    '📱 <b>SMS code received</b>',
    '',
    `<b>Buyer:</b> ${escapeHtml(buyer.full_name)}`,
    `<b>Email:</b> ${escapeHtml(buyer.email)}`,
    `<b>Number:</b> <code>${escapeHtml(order.phone_number)}</code>`,
    `<b>Country:</b> ${escapeHtml(country)}`,
    `<b>Service:</b> ${escapeHtml(service)}`,
    code ? `<b>Code:</b> <code>${escapeHtml(code)}</code>` : null,
    `<b>Charged:</b> ${formatNgn(order.charged_ngn)}`,
    `<b>Cost (USD):</b> $${Number(order.cost_usd).toFixed(2)}`,
    `<b>Status:</b> ${escapeHtml(order.status)}`,
    `<b>Order ID:</b> <code>${escapeHtml(order.id)}</code>`,
    `<b>SMS Pool ID:</b> <code>${escapeHtml(order.smspool_order_id)}</code>`,
    expiresLine,
    '',
    `<a href="${adminSmsUrl}">Open Admin SMS</a>`,
  ].filter(Boolean).join('\n');
}

function buildWalletDepositTelegramMessage(
  tx: WalletTransactionRow,
  buyer: { full_name: string; email: string },
  adminTransactionsUrl: string,
) {
  const metadata = tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : {};
  const originalAmount = Number(metadata.original_amount);
  const originalCurrency = typeof metadata.original_currency === 'string'
    ? metadata.original_currency.trim()
    : '';
  const txRef = typeof metadata.tx_ref === 'string' ? metadata.tx_ref.trim() : '';
  const paidLine = originalAmount > 0 && originalCurrency
    ? `<b>Paid:</b> ${escapeHtml(originalCurrency)} ${originalAmount.toLocaleString('en-NG')}`
    : null;

  return [
    '💰 <b>New wallet deposit</b>',
    '',
    `<b>User:</b> ${escapeHtml(buyer.full_name)}`,
    `<b>Email:</b> ${escapeHtml(buyer.email)}`,
    `<b>Wallet credit:</b> ${formatNgn(tx.amount)}`,
    paidLine,
    `<b>Payment method:</b> ${escapeHtml(tx.payment_method)}`,
    `<b>Reference:</b> <code>${escapeHtml(tx.ref)}</code>`,
    txRef ? `<b>Provider ref:</b> <code>${escapeHtml(txRef)}</code>` : null,
    `<b>Transaction ID:</b> <code>${escapeHtml(tx.id)}</code>`,
    '',
    `<a href="${adminTransactionsUrl}">Open Admin Transactions</a>`,
  ].filter(Boolean).join('\n');
}

async function sendTelegramMessage(text: string) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');

  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is missing in Supabase Edge Function secrets (not .env)');
  }

  async function postMessage(body: Record<string, unknown>) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.description || 'Telegram sendMessage failed');
    }
  }

  try {
    await postMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (htmlError) {
    const htmlMessage = htmlError instanceof Error ? htmlError.message : 'HTML send failed';
    if (!htmlMessage.toLowerCase().includes("can't parse")) {
      throw htmlError;
    }
    await postMessage({
      chat_id: chatId,
      text: text.replace(/<[^>]+>/g, ''),
      disable_web_page_preview: true,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    if (!expectedSecret) {
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providedSecret = req.headers.get('x-telegram-webhook-secret');
    if (providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      order_id?: string;
      sms_order_id?: string;
      wallet_transaction_id?: string;
      user_id?: string;
    };
    const orderId = body.order_id?.trim();
    const smsOrderId = body.sms_order_id?.trim();
    const walletTransactionId = body.wallet_transaction_id?.trim();
    const userId = body.user_id?.trim();
    const idCount = [orderId, smsOrderId, walletTransactionId, userId].filter(Boolean).length;
    if (idCount !== 1) {
      throw new Error('Provide exactly one of order_id, sms_order_id, or wallet_transaction_id');
    }

    if (userId) {
      return new Response(JSON.stringify({ ok: true, skipped: 'signup_alerts_disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Service role key is unavailable. Supabase injects SUPABASE_SERVICE_ROLE_KEY automatically; redeploy the function if this persists.');
    }

    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || '').replace(/\/$/, '');
    const adminOrdersUrl = appUrl ? `${appUrl}/admin/orders` : '/admin/orders';
    const adminSmsUrl = appUrl ? `${appUrl}/admin/sms-pricing/smspool` : '/admin/sms-pricing/smspool';
    const adminTransactionsUrl = appUrl ? `${appUrl}/admin/transactions` : '/admin/transactions';

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (walletTransactionId) {
      const { data: walletTx, error: walletTxError } = await supabase
        .from('wallet_transactions')
        .select(`
          id,
          user_id,
          ref,
          kind,
          payment_method,
          amount,
          currency,
          status,
          metadata,
          created_at
        `)
        .eq('id', walletTransactionId)
        .single();

      if (walletTxError || !walletTx) {
        throw walletTxError ?? new Error('Wallet transaction not found');
      }

      if (walletTx.kind !== 'deposit' || walletTx.status !== 'completed') {
        throw new Error('Transaction is not a completed deposit');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', walletTx.user_id)
        .single();

      if (profileError || !profile) {
        throw profileError ?? new Error('User profile not found');
      }

      const message = buildWalletDepositTelegramMessage(
        walletTx as WalletTransactionRow,
        profile,
        adminTransactionsUrl,
      );
      await sendTelegramMessage(message);
    } else if (smsOrderId) {
      const { data: smsOrder, error: smsOrderError } = await supabase
        .from('sms_number_orders')
        .select(`
          id,
          user_id,
          phone_number,
          country_name,
          country_id,
          service_name,
          service_id,
          status,
          verification_code,
          charged_ngn,
          cost_usd,
          expires_at,
          smspool_order_id,
          created_at
        `)
        .eq('id', smsOrderId)
        .single();

      if (smsOrderError || !smsOrder) {
        throw smsOrderError ?? new Error('SMS order not found');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', smsOrder.user_id)
        .single();

      if (profileError || !profile) {
        throw profileError ?? new Error('Buyer profile not found');
      }

      const message = buildSmsOrderTelegramMessage(
        smsOrder as SmsNumberOrderRow,
        profile,
        adminSmsUrl,
      );
      await sendTelegramMessage(message);
    } else {
      const orderSelect = `
          id,
          user_id,
          total_amount,
          status,
          payment_status,
          created_at,
          order_items(
            quantity,
            price,
            delivered_details,
            product:products(title, slug, niche, platform)
          )
        `;

      // LOGGSPLUG (and similar) insert the order first, then items. Retry briefly if items are not ready yet.
      let order: OrderRow | null = null;
      let orderError: { message?: string } | null = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await supabase
          .from('orders')
          .select(orderSelect)
          .eq('id', orderId)
          .single();

        orderError = result.error;
        order = (result.data as OrderRow | null) ?? null;

        if (orderError || !order) break;
        if ((order.order_items ?? []).length > 0) break;
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }

      if (orderError || !order) {
        throw orderError ?? new Error('Order not found');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', order.user_id)
        .single();

      if (profileError || !profile) {
        throw profileError ?? new Error('Buyer profile not found');
      }

      const message = buildTelegramMessage(order as OrderRow, profile, adminOrdersUrl);
      await sendTelegramMessage(message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Telegram alert failed';
    console.error(message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
