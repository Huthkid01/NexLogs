import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildNewProductsBroadcastEmail } from './templates.ts';
import {
  buildOneClickUnsubscribeUrl,
  buildPublicUnsubscribeUrl,
  getUnsubscribedUserIds,
  getUnsubscribeTokensForUsers,
} from '../_shared/marketing-unsubscribe.ts';
import {
  buildDeliverabilityHeaders,
  sanitizeBroadcastMessage,
  sanitizeBroadcastSubject,
  validateBroadcastContent,
} from './deliverability.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_RECIPIENTS = 200;
const SEND_DELAY_MS = 120;

interface BroadcastRequest {
  product_ids?: string[];
  subject?: string;
  custom_message?: string;
  recipient_user_ids?: string[];
  send_to_all?: boolean;
}

async function sendViaSmtp(
  input: { to: string; subject: string; html: string; text?: string; headers?: Record<string, string> },
  options: { host: string; port: number; secure: boolean; user: string; pass: string; from: string },
) {
  const nodemailer = await import('npm:nodemailer@6.9.16');
  const transport = nodemailer.default.createTransport({
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
        headers: input.headers,
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}) {
  const host = Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com';
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const fromName = 'Nexlogs';
  const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || user;

  if (!user || !pass || !fromAddress) {
    throw new Error('SMTP_USER, SMTP_PASS, and EMAIL_FROM_ADDRESS must be set in Supabase Edge Function secrets');
  }

  const from = `"${fromName}" <${fromAddress}>`;
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
      console.error(`[send-admin-broadcast-email] SMTP ${host}:${attempt.port} failed:`, message);
    }
  }

  throw lastError ?? new Error('SMTP send failed');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    return { error: jsonResponse({ error: 'Missing Supabase environment configuration for broadcast email' }, 500) };
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
    const { adminClient, userId } = auth as { adminClient: ReturnType<typeof createClient>; userId: string };

    const body = await req.json() as BroadcastRequest;
    const productIds = Array.isArray(body.product_ids)
      ? body.product_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const sendToAll = Boolean(body.send_to_all);
    const requestedRecipientIds = Array.isArray(body.recipient_user_ids)
      ? body.recipient_user_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];

    let subject = sanitizeBroadcastSubject(body.subject?.trim() || 'New products available on Nexlogs');
    let customMessage = sanitizeBroadcastMessage(body.custom_message ?? '');

    const validated = validateBroadcastContent(subject, customMessage);
    subject = validated.sanitizedSubject;
    customMessage = validated.sanitizedMessage;

    const appName = Deno.env.get('APP_NAME') || 'Nexlogs';
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || 'https://www.nexlogs.store').replace(
      /\/$/,
      '',
    );
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    let productsQuery = adminClient
      .from('products')
      .select('id, title, price, description, slug')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (productIds.length > 0) {
      productsQuery = adminClient
        .from('products')
        .select('id, title, price, description, slug')
        .in('id', productIds)
        .eq('is_active', true);
    }

    const { data: products, error: productsError } = await productsQuery;
    if (productsError) throw productsError;
    if (!products?.length) {
      return jsonResponse({ error: 'Select at least one active product to include in the email' }, 400);
    }

    const { data: recipients, error: recipientsError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('is_suspended', false)
      .neq('role', 'admin')
      .not('email', 'is', null)
      .order('created_at', { ascending: true });

    if (recipientsError) throw recipientsError;

    const uniqueRecipients = Array.from(
      new Map(
        (recipients ?? [])
          .filter((recipient) => recipient.email?.trim())
          .map((recipient) => [recipient.email.trim().toLowerCase(), recipient]),
      ).values(),
    );

    if (!uniqueRecipients.length) {
      return jsonResponse({ error: 'No eligible user emails found' }, 400);
    }

    const unsubscribedIds = await getUnsubscribedUserIds(
      adminClient,
      uniqueRecipients.map((recipient) => recipient.id),
    );
    const eligibleRecipients = uniqueRecipients.filter((recipient) => !unsubscribedIds.has(recipient.id));

    if (!eligibleRecipients.length) {
      return jsonResponse({ error: 'All selected contacts have unsubscribed from promotional emails' }, 400);
    }

    const totalEligible = eligibleRecipients.length;

    let targetRecipients = eligibleRecipients;
    if (!sendToAll) {
      if (!requestedRecipientIds.length) {
        return jsonResponse({ error: 'Select at least one contact in the To field' }, 400);
      }
      const selectedSet = new Set(requestedRecipientIds);
      targetRecipients = eligibleRecipients.filter((recipient) => selectedSet.has(recipient.id));
      if (!targetRecipients.length) {
        return jsonResponse({ error: 'Selected contacts are not eligible to receive emails' }, 400);
      }
    }

    if (!targetRecipients.length) {
      return jsonResponse({ error: 'No recipients selected' }, 400);
    }

    if (targetRecipients.length > MAX_RECIPIENTS) {
      return jsonResponse(
        { error: `Too many recipients (${targetRecipients.length}). Maximum ${MAX_RECIPIENTS} per broadcast.` },
        400,
      );
    }

    const unsubscribeTokens = await getUnsubscribeTokensForUsers(
      adminClient,
      targetRecipients.map((recipient) => recipient.id),
    );

    let sent = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const recipient of targetRecipients) {
      const emailAddress = recipient.email.trim();
      const fullName = recipient.full_name?.trim() || emailAddress.split('@')[0];
      const token = unsubscribeTokens.get(recipient.id);
      const publicUnsubscribeUrl = token ? buildPublicUnsubscribeUrl(appUrl, token) : `${appUrl}/support`;
      const oneClickUnsubscribeUrl = token && supabaseUrl
        ? buildOneClickUnsubscribeUrl(supabaseUrl, token)
        : publicUnsubscribeUrl;
      const emailContent = buildNewProductsBroadcastEmail({
        appName,
        appUrl,
        fullName,
        subject,
        customMessage,
        products: products.map((product) => ({
          title: product.title,
          slug: product.slug,
          price: Number(product.price),
        })),
        unsubscribeUrl: publicUnsubscribeUrl,
      });
      const deliverabilityHeaders = buildDeliverabilityHeaders(appUrl, oneClickUnsubscribeUrl);

      try {
        await sendMail({
          to: emailAddress,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          headers: deliverabilityHeaders,
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Send failed';
        failures.push(`${emailAddress}: ${message}`);
        console.error('[send-admin-broadcast-email] failed for', emailAddress, message);
      }

      if (SEND_DELAY_MS > 0) {
        await sleep(SEND_DELAY_MS);
      }
    }

    const productIdList = products.map((product) => product.id);
    const recipientUserIds = targetRecipients.map((recipient) => recipient.id);

    try {
      await adminClient.from('email_broadcasts').insert({
        sent_by: userId,
        subject,
        product_ids: productIdList,
        custom_message: customMessage || null,
        recipient_count: targetRecipients.length,
        sent_count: sent,
        failed_count: failed,
        recipient_user_ids: recipientUserIds,
      });
    } catch (logError) {
      console.error('[send-admin-broadcast-email] failed to save broadcast history', logError);
    }

    try {
      await adminClient.from('activity_logs').insert({
        user_id: userId,
        action: 'email_broadcast',
        entity: 'profiles',
        metadata: {
          subject,
          product_ids: productIdList,
          total_eligible: totalEligible,
          recipient_count: targetRecipients.length,
          recipient_limit: sendToAll ? null : requestedRecipientIds.length,
          send_to_all: sendToAll,
          sent_count: sent,
          failed_count: failed,
        },
      });
    } catch (logError) {
      console.error('[send-admin-broadcast-email] failed to save activity log', logError);
    }

    return jsonResponse({
      ok: true,
      total_eligible: totalEligible,
      recipient_count: targetRecipients.length,
      sent_count: sent,
      failed_count: failed,
      failures: failures.slice(0, 10),
      from: 'Nexlogs <support@nexlogs.store>',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Broadcast email failed';
    console.error('[send-admin-broadcast-email]', message);
    return jsonResponse(
      {
        error: message,
        hint: 'Deploy send-admin-broadcast-email and set SMTP_USER=support@nexlogs.store in Edge Function secrets.',
      },
      500,
    );
  }
});
