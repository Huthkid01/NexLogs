import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { transparentGifResponse } from '../_shared/marketing-email-tracking.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function isSafeRedirect(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const requestUrl = new URL(req.url);
  const action = requestUrl.searchParams.get('action')?.trim().toLowerCase();
  const token = requestUrl.searchParams.get('token')?.trim() ?? '';

  if (!token) {
    return new Response('Missing token', { status: 400, headers: corsHeaders });
  }

  const { data: sendRow, error: sendError } = await adminClient
    .from('email_marketing_sends')
    .select('id, open_count, click_count, first_opened_at, first_clicked_at')
    .eq('tracking_token', token)
    .maybeSingle();

  if (sendError || !sendRow) {
    return action === 'open'
      ? transparentGifResponse()
      : new Response('Not found', { status: 404, headers: corsHeaders });
  }

  if (action === 'open') {
    const now = new Date().toISOString();
    await adminClient
      .from('email_marketing_sends')
      .update({
        open_count: Number(sendRow.open_count ?? 0) + 1,
        first_opened_at: sendRow.first_opened_at ?? now,
      })
      .eq('id', sendRow.id);

    return transparentGifResponse();
  }

  if (action === 'click') {
    const destination = requestUrl.searchParams.get('url')?.trim() ?? '';
    if (!isSafeRedirect(destination)) {
      return new Response('Invalid destination', { status: 400, headers: corsHeaders });
    }

    const now = new Date().toISOString();
    const userAgent = req.headers.get('user-agent');

    await adminClient.from('email_marketing_clicks').insert({
      send_id: sendRow.id,
      link_url: destination,
      user_agent: userAgent,
    });

    await adminClient
      .from('email_marketing_sends')
      .update({
        click_count: Number(sendRow.click_count ?? 0) + 1,
        first_clicked_at: sendRow.first_clicked_at ?? now,
      })
      .eq('id', sendRow.id);

    return Response.redirect(destination, 302);
  }

  return new Response('Unsupported action', { status: 400, headers: corsHeaders });
});
