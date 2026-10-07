/**
 * Live support call (opt-in).
 * Creates an ephemeral Daily.co room and notifies the admin on Telegram with a join link.
 * No database writes. Safe to deploy without enabling the frontend flag.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROOM_TTL_SECONDS = 60 * 45; // 45 minutes

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function sendTelegramMessage(text: string) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');

  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is missing');
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
      disable_web_page_preview: false,
    });
  } catch (htmlError) {
    const htmlMessage = htmlError instanceof Error ? htmlError.message : 'HTML send failed';
    if (!htmlMessage.toLowerCase().includes("can't parse")) {
      throw htmlError;
    }
    await postMessage({
      chat_id: chatId,
      text: text.replace(/<[^>]+>/g, ''),
      disable_web_page_preview: false,
    });
  }
}

async function createDailyRoom(roomName: string) {
  const apiKey = Deno.env.get('DAILY_API_KEY');
  if (!apiKey) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const exp = Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS;
  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'public',
      properties: {
        exp,
        enable_chat: true,
        start_video_off: true,
        start_audio_off: false,
        max_participants: 4,
        eject_at_room_exp: true,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.info || payload?.error || 'Failed to create Daily room');
  }

  return {
    roomUrl: String(payload.url),
    roomName: String(payload.name),
    expiresAt: exp,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) {
      return json(500, { error: 'Supabase env missing' });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let callerName = 'Guest';
    let callerEmail = 'not signed in';
    let callerId = 'guest';

    if (user) {
      callerId = user.id;
      callerEmail = user.email || 'unknown';
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();
      callerName = profile?.full_name?.trim() || user.user_metadata?.full_name || 'Customer';
      if (profile?.email) callerEmail = profile.email;
    }

    const roomName = `nexlogs-support-${crypto.randomUUID().slice(0, 8)}`;
    const room = await createDailyRoom(roomName);

    const message = [
      '📞 <b>Live support call waiting</b>',
      '',
      `<b>Customer:</b> ${escapeHtml(callerName)}`,
      `<b>Email:</b> ${escapeHtml(callerEmail)}`,
      `<b>User ID:</b> <code>${escapeHtml(callerId)}</code>`,
      '',
      'Tap below to join the call and talk with the customer:',
      `<a href="${escapeHtml(room.roomUrl)}">${escapeHtml(room.roomUrl)}</a>`,
      '',
      '<i>Room expires in about 45 minutes.</i>',
    ].join('\n');

    await sendTelegramMessage(message);

    return json(200, {
      ok: true,
      roomUrl: room.roomUrl,
      roomName: room.roomName,
      expiresAt: room.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Live support call failed';
    console.error('[live-support-call]', message);
    return json(500, { error: message });
  }
});
