import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  appendUnsubscribeToHtml,
  appendUnsubscribeToText,
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
  buildDeliverabilityHeaders,
  htmlToPlainText,
  personalizeHtml,
  validateCampaignContent,
} from './deliverability.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_RECIPIENTS = 200;
const SEND_DELAY_MS = 120;

interface HtmlCampaignRequest {
  subject?: string;
  html_body?: string;
  template_name?: string;
  recipient_user_ids?: string[];
  recipient_emails?: string[];
  send_to_all?: boolean;
  skip_history?: boolean;
  tracking_token?: string;
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
    auth: { user: options.user, pass: options.pass },
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
  const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || user;

  if (!user || !pass || !fromAddress) {
    throw new Error('SMTP_USER, SMTP_PASS, and EMAIL_FROM_ADDRESS must be set in Supabase Edge Function secrets');
  }

  const from = `"Nexlogs" <${fromAddress}>`;
  for (const attempt of [{ port: 465, secure: true }, { port: 587, secure: false }]) {
    try {
      await sendViaSmtp(input, { host, port: attempt.port, secure: attempt.secure, user, pass, from });
      return;
    } catch (error) {
      console.error(`[send-admin-html-campaign] SMTP ${host}:${attempt.port} failed:`, error);
    }
  }
  throw new Error('SMTP send failed');
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
    const { adminClient, userId } = auth as { adminClient: ReturnType<typeof createClient>; userId: string };

    const body = await req.json() as HtmlCampaignRequest;
    const sendToAll = Boolean(body.send_to_all);
    const skipHistory = Boolean(body.skip_history);
    const trackingToken = body.tracking_token?.trim() ?? '';
    const requestedRecipientIds = Array.isArray(body.recipient_user_ids)
      ? body.recipient_user_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const requestedRecipientEmails = parseRecipientEmails(body.recipient_emails);
    const templateName = body.template_name?.trim() || null;

    const validated = validateCampaignContent(body.subject?.trim() || '', body.html_body || '');
    const subject = validated.sanitizedSubject;
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || 'https://www.nexlogs.store').replace(
      /\/$/,
      '',
    );
    const appName = Deno.env.get('APP_NAME') || 'Nexlogs';
    const htmlTemplate = validated.sanitizedHtml;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    const resolved = await resolveMarketingRecipients(adminClient, {
      sendToAll,
      recipientUserIds: requestedRecipientIds,
      recipientEmails: requestedRecipientEmails,
    });

    if (resolved.error || !resolved.data) {
      return jsonResponse({ error: resolved.error || 'No recipients selected' }, 400);
    }

    const { recipients: targetRecipients, userIds: recipientUserIds, externalEmails: recipientExternalEmails } =
      resolved.data;

    if (targetRecipients.length > MAX_RECIPIENTS) {
      return jsonResponse(
        { error: `Too many recipients (${targetRecipients.length}). Maximum ${MAX_RECIPIENTS} per campaign.` },
        400,
      );
    }

    const unsubscribeTokens = await loadUnsubscribeTokensForRecipients(adminClient, targetRecipients);

    let sent = 0;
    let failed = 0;
    const failures: string[] = [];
    const plainBase = htmlToPlainText(htmlTemplate);

    for (const recipient of targetRecipients) {
      const emailAddress = recipient.email;
      const fullName = recipient.fullName;
      const token = unsubscribeTokens.get(emailAddress);
      const publicUnsubscribeUrl = token ? buildPublicUnsubscribeUrl(appUrl, token) : `${appUrl}/support`;
      const oneClickUnsubscribeUrl = token && supabaseUrl
        ? buildOneClickUnsubscribeUrl(supabaseUrl, token)
        : publicUnsubscribeUrl;
      const personalizedHtml = personalizeHtml(htmlTemplate, fullName);
      let html = appendUnsubscribeToHtml(personalizedHtml, publicUnsubscribeUrl, appName, {
        isAccountHolder: !recipient.isExternal,
      });
      if (trackingToken) {
        html = applyEmailTracking(html, buildMarketingTrackUrl(supabaseUrl), trackingToken);
      }
      const text = appendUnsubscribeToText(personalizeHtml(plainBase, fullName), publicUnsubscribeUrl);
      const deliverabilityHeaders = buildDeliverabilityHeaders(appUrl, oneClickUnsubscribeUrl);

      try {
        await sendMail({
          to: emailAddress,
          subject,
          html,
          text,
          headers: deliverabilityHeaders,
        });
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
        console.error('[send-admin-html-campaign] failed for', emailAddress, message);
      }

      if (SEND_DELAY_MS > 0) {
        await sleep(SEND_DELAY_MS);
      }
    }

    if (!skipHistory) {
    try {
      await adminClient.from('email_campaigns').insert({
        sent_by: userId,
        subject,
        html_body: htmlTemplate,
        template_name: templateName,
        recipient_count: targetRecipients.length,
        sent_count: sent,
        failed_count: failed,
        recipient_user_ids: recipientUserIds,
        recipient_emails: recipientExternalEmails,
      });
    } catch (logError) {
      console.error('[send-admin-html-campaign] failed to save campaign history', logError);
    }

    try {
      await adminClient.from('activity_logs').insert({
        user_id: userId,
        action: 'email_html_campaign',
        entity: 'profiles',
        metadata: {
          subject,
          template_name: templateName,
          recipient_count: targetRecipients.length,
          send_to_all: sendToAll,
          sent_count: sent,
          failed_count: failed,
        },
      });
    } catch (logError) {
      console.error('[send-admin-html-campaign] failed to save activity log', logError);
    }
    }

    return jsonResponse({
      ok: true,
      recipient_count: targetRecipients.length,
      sent_count: sent,
      failed_count: failed,
      failures: failures.slice(0, 10),
      from: 'Nexlogs <support@nexlogs.store>',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HTML campaign send failed';
    console.error('[send-admin-html-campaign]', message);
    return jsonResponse({ error: message }, 500);
  }
});
