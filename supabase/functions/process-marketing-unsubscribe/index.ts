import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, List-Unsubscribe, List-Unsubscribe-Post',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'your email address';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

async function unsubscribeByToken(adminClient: ReturnType<typeof createClient>, token: string) {
  const { data: tokenRow, error: tokenError } = await adminClient
    .from('marketing_email_unsubscribe_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle();

  if (tokenError) throw tokenError;
  if (!tokenRow?.user_id) {
    return { ok: false as const, status: 404, message: 'This unsubscribe link is invalid or has expired.' };
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('email')
    .eq('id', tokenRow.user_id)
    .single();

  if (profileError || !profile?.email?.trim()) {
    return { ok: false as const, status: 404, message: 'Could not find the account for this unsubscribe link.' };
  }

  const email = profile.email.trim().toLowerCase();

  const { error: upsertError } = await adminClient.from('marketing_email_unsubscribes').upsert(
    {
      user_id: tokenRow.user_id,
      email,
      unsubscribed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (upsertError) throw upsertError;

  return {
    ok: true as const,
    email: maskEmail(email),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase environment configuration' }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const url = new URL(req.url);
    const token = url.searchParams.get('token')?.trim();

    if (!token) {
      return jsonResponse({ error: 'Missing unsubscribe token' }, 400);
    }

    const result = await unsubscribeByToken(adminClient, token);
    if (!result.ok) {
      return jsonResponse({ error: result.message }, result.status);
    }

    return jsonResponse({
      ok: true,
      email: result.email,
      message: 'You have been unsubscribed from promotional emails.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unsubscribe failed';
    console.error('[process-marketing-unsubscribe]', message);
    return jsonResponse({ error: message }, 500);
  }
});
