import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getDefaultMarketingSmtpConfig,
  parseSmtpAccountInput,
  resolveMarketingSmtpConfig,
  toPublicSmtpAccount,
  verifyMarketingSmtp,
} from '../_shared/marketing-smtp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: jsonResponse({ error: 'Missing authorization header' }, 401) };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: jsonResponse({ error: 'Missing Supabase environment configuration' }, 500) };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (adminProfileError || adminProfile?.role !== 'admin') {
    return { error: jsonResponse({ error: 'Admin access required' }, 403) };
  }

  return { adminClient, userId: authData.user.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await requireAdmin(req);
    if ('error' in auth && auth.error) return auth.error;
    const { adminClient, userId } = auth as {
      adminClient: ReturnType<typeof createClient>;
      userId: string;
    };

    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? 'list').trim().toLowerCase();

    if (action === 'list') {
      let defaultAccount: Record<string, unknown>;
      try {
        const defaultSmtp = getDefaultMarketingSmtpConfig();
        defaultAccount = {
          id: 'default',
          label: defaultSmtp.label,
          host: defaultSmtp.host,
          port: defaultSmtp.port,
          secure: defaultSmtp.secure,
          username: defaultSmtp.username,
          from_name: defaultSmtp.fromName,
          from_address: defaultSmtp.fromAddress,
          is_active: true,
          is_default: true,
          has_password: true,
        };
      } catch {
        defaultAccount = {
          id: 'default',
          label: 'Default (support@nexlogs.store)',
          host: Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com',
          port: Number(Deno.env.get('SMTP_PORT') || 465),
          secure: Deno.env.get('SMTP_SECURE') !== 'false',
          username: Deno.env.get('SMTP_USER') || 'support@nexlogs.store',
          from_name: 'Nexlogs',
          from_address: Deno.env.get('EMAIL_FROM_ADDRESS') || 'support@nexlogs.store',
          is_active: true,
          is_default: true,
          has_password: Boolean(Deno.env.get('SMTP_PASS')),
        };
      }

      const { data, error } = await adminClient
        .from('marketing_smtp_accounts')
        .select('id, label, host, port, secure, username, from_name, from_address, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return jsonResponse({
        ok: true,
        default_account: defaultAccount,
        accounts: (data ?? []).map((row) => toPublicSmtpAccount(row as never)),
      });
    }

    if (action === 'create') {
      const input = parseSmtpAccountInput(body, { requirePassword: true });
      const { data, error } = await adminClient
        .from('marketing_smtp_accounts')
        .insert({
          ...input,
          created_by: userId,
        })
        .select('id, label, host, port, secure, username, from_name, from_address, is_active, created_at, updated_at')
        .single();

      if (error) throw error;
      return jsonResponse({ ok: true, account: toPublicSmtpAccount(data as never) });
    }

    if (action === 'update') {
      const id = String(body.id ?? '').trim();
      if (!id) return jsonResponse({ error: 'SMTP account id is required' }, 400);

      const input = parseSmtpAccountInput(body, { requirePassword: false });
      const patch: Record<string, unknown> = {
        label: input.label,
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        from_name: input.from_name,
        from_address: input.from_address,
        is_active: input.is_active,
      };
      if (input.password) {
        patch.password = input.password;
      }

      const { data, error } = await adminClient
        .from('marketing_smtp_accounts')
        .update(patch)
        .eq('id', id)
        .select('id, label, host, port, secure, username, from_name, from_address, is_active, created_at, updated_at')
        .single();

      if (error) throw error;
      return jsonResponse({ ok: true, account: toPublicSmtpAccount(data as never) });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '').trim();
      if (!id) return jsonResponse({ error: 'SMTP account id is required' }, 400);

      const { error } = await adminClient.from('marketing_smtp_accounts').delete().eq('id', id);
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    if (action === 'test') {
      const id = String(body.id ?? body.smtp_account_id ?? 'default').trim() || 'default';
      let smtp = await resolveMarketingSmtpConfig(adminClient, id === 'default' ? null : id);

      // Allow testing unsaved form values.
      if (body.host || body.username || body.password || body.from_address) {
        const input = parseSmtpAccountInput(body, { requirePassword: true });
        smtp = {
          id: null,
          label: input.label,
          host: input.host,
          port: input.port,
          secure: input.secure,
          username: input.username,
          password: input.password,
          fromName: input.from_name,
          fromAddress: input.from_address,
          isDefault: false,
        };
      }

      await verifyMarketingSmtp(smtp);
      return jsonResponse({
        ok: true,
        message: `SMTP connection verified for ${smtp.fromAddress}`,
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP management failed';
    console.error('[manage-marketing-smtp]', message);
    return jsonResponse({ error: message }, 500);
  }
});
