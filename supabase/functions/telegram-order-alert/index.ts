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
  } | null;
}

interface OrderRow {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  profile: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  order_items: OrderItemRow[];
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatUsd(amount: number) {
  return `$${Number(amount).toFixed(2)}`;
}

function isRdpSlug(slug: string | null | undefined) {
  return Boolean(slug?.includes('-rdp-'));
}

function getProfile(order: OrderRow) {
  if (!order.profile) return { full_name: 'Unknown buyer', email: 'unknown' };
  return Array.isArray(order.profile) ? order.profile[0] : order.profile;
}

function buildTelegramMessage(order: OrderRow, adminOrdersUrl: string) {
  const buyer = getProfile(order);
  const items = order.order_items ?? [];
  const hasRdp = items.some((item) => isRdpSlug(item.product?.slug));
  const productLines = items.map((item) => {
    const title = item.product?.title ?? 'Unknown product';
    const slug = item.product?.slug ?? '';
    const type = isRdpSlug(slug) ? 'RDP' : (item.product?.niche ?? item.product?.platform ?? 'Product');
    return `• ${escapeHtml(title)} (${escapeHtml(type)}) x${item.quantity} — ${formatUsd(item.price)}`;
  });

  const header = hasRdp
    ? '🖥️ <b>New RDP purchase — action required</b>'
    : '🛒 <b>New purchase on Nexlogs</b>';

  const actionLine = hasRdp
    ? `\n\n⚠️ Paste RDP credentials for the buyer in Admin → Orders.`
    : '';

  return [
    header,
    '',
    `<b>Buyer:</b> ${escapeHtml(buyer.full_name)}`,
    `<b>Email:</b> ${escapeHtml(buyer.email)}`,
    `<b>Total:</b> ${formatUsd(order.total_amount)}`,
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

async function sendTelegramMessage(text: string) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');

  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description || 'Telegram sendMessage failed');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    if (expectedSecret) {
      const providedSecret = req.headers.get('x-telegram-webhook-secret');
      if (providedSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json() as { order_id?: string };
    const orderId = body.order_id?.trim();
    if (!orderId) {
      throw new Error('Missing order_id');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service role is not configured');
    }

    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || '').replace(/\/$/, '');
    const adminOrdersUrl = appUrl ? `${appUrl}/admin/orders` : '/admin/orders';

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        payment_status,
        created_at,
        profile:profiles(full_name, email),
        order_items(
          quantity,
          price,
          delivered_details,
          product:products(title, slug, niche, platform)
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !data) {
      throw error ?? new Error('Order not found');
    }

    const message = buildTelegramMessage(data as OrderRow, adminOrdersUrl);
    await sendTelegramMessage(message);

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
