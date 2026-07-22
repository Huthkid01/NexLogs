import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildNewProductsBroadcastEmail } from './templates.ts';
import {
  buildOneClickUnsubscribeUrl,
  buildPublicUnsubscribeUrl,
} from '../_shared/marketing-unsubscribe.ts';
import {
  loadUnsubscribeTokensForRecipients,
  parseRecipientEmails,
  resolveMarketingRecipients,
} from '../_shared/marketing-recipients.ts';
import {
  applyEmailTracking,
  buildMarketingTrackUrl,
  markMarketingSendResult,
} from '../_shared/marketing-email-tracking.ts';
import {
  resolveMarketingSmtpConfig,
  sendViaMarketingSmtp,
  type MarketingSmtpConfig,
} from '../_shared/marketing-smtp.ts';
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
  recipient_emails?: string[];
  send_to_all?: boolean;
  skip_history?: boolean;
  tracking_token?: string;
  smtp_account_id?: string | null;
}

async function sendMail(
  input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    headers?: Record<string, string>;
  },
  smtp: MarketingSmtpConfig,
) {
  return sendViaMarketingSmtp(input, smtp);
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
    const skipHistory = Boolean(body.skip_history);
    const trackingToken = body.tracking_token?.trim() ?? '';
    const smtpAccountId = body.smtp_account_id?.trim() || null;
    const requestedRecipientIds = Array.isArray(body.recipient_user_ids)
      ? body.recipient_user_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const requestedRecipientEmails = parseRecipientEmails(body.recipient_emails);

    let subject = sanitizeBroadcastSubject(body.subject?.trim() || 'New products available on Nexlogs');
    let customMessage = sanitizeBroadcastMessage(body.custom_message ?? '');

    const validated = validateBroadcastContent(subject, customMessage);
    subject = validated.sanitizedSubject;
    customMessage = validated.sanitizedMessage;

    const smtp = await resolveMarketingSmtpConfig(adminClient, smtpAccountId);
    const appName = Deno.env.get('APP_NAME') || 'Nexlogs';
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || 'https://www.nexlogs.site').replace(
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

    const resolved = await resolveMarketingRecipients(adminClient, {
      sendToAll,
      recipientUserIds: requestedRecipientIds,
      recipientEmails: requestedRecipientEmails,
    });

    if (resolved.error || !resolved.data) {
      return jsonResponse({ error: resolved.error || 'No recipients selected' }, 400);
    }

    const {
      recipients: targetRecipients,
      userIds: recipientUserIds,
      externalEmails: recipientExternalEmails,
      totalEligibleUsers,
    } = resolved.data;

    if (!targetRecipients.length) {
      return jsonResponse({ error: 'No recipients selected' }, 400);
    }

    if (targetRecipients.length > MAX_RECIPIENTS) {
      return jsonResponse(
        { error: `Too many recipients (${targetRecipients.length}). Maximum ${MAX_RECIPIENTS} per broadcast.` },
        400,
      );
    }

    const unsubscribeTokens = await loadUnsubscribeTokensForRecipients(adminClient, targetRecipients);

    let sent = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const recipient of targetRecipients) {
      const emailAddress = recipient.email;
      const fullName = recipient.fullName;
      const token = unsubscribeTokens.get(emailAddress);
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
        isAccountHolder: !recipient.isExternal,
      });
      const deliverabilityHeaders = buildDeliverabilityHeaders(appUrl, oneClickUnsubscribeUrl);
      let html = emailContent.html;
      if (trackingToken) {
        html = applyEmailTracking(html, buildMarketingTrackUrl(supabaseUrl), trackingToken);
      }

      try {
        await sendMail({
          to: emailAddress,
          subject: emailContent.subject,
          html,
          text: emailContent.text,
          headers: deliverabilityHeaders,
        }, smtp);
        if (trackingToken) {
          await markMarketingSendResult(adminClient, trackingToken, { ok: true });
        }
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Send failed';
        if (trackingToken) {
          await markMarketingSendResult(adminClient, trackingToken, { ok: false, error: message });
        }
        failed += 1;
        failures.push(`${emailAddress}: ${message}`);
        console.error('[send-admin-broadcast-email] failed for', emailAddress, message);
      }

      if (SEND_DELAY_MS > 0) {
        await sleep(SEND_DELAY_MS);
      }
    }

    const productIdList = products.map((product) => product.id);

    if (!skipHistory) {
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
        recipient_emails: recipientExternalEmails,
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
          total_eligible: totalEligibleUsers,
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
    }

    return jsonResponse({
      ok: true,
      total_eligible: totalEligibleUsers,
      recipient_count: targetRecipients.length,
      sent_count: sent,
      failed_count: failed,
      failures: failures.slice(0, 10),
      from: `${smtp.fromName} <${smtp.fromAddress}>`,
      smtp_account: smtp.label,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Broadcast email failed';
    console.error('[send-admin-broadcast-email]', message);
    return jsonResponse(
      {
        error: message,
        hint: 'Deploy send-admin-broadcast-email and set SMTP_USER=support@nexlogs.site in Edge Function secrets.',
      },
      500,
    );
  }
});
