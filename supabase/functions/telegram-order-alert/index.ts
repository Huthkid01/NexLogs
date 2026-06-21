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
    return `• ${escapeHtml(title)} (${escapeHtml(type)}) x${item.quantity} — ${formatUsd(item.price)}`;
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
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Service role key is unavailable. Supabase injects SUPABASE_SERVICE_ROLE_KEY automatically; redeploy the function if this persists.');
    }

    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || '').replace(/\/$/, '');
    const adminOrdersUrl = appUrl ? `${appUrl}/admin/orders` : '/admin/orders';

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
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
      `)
      .eq('id', orderId)
      .single();

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
