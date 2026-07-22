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
  resolveMarketingSmtpConfig,
  sendViaMarketingSmtp,
  type MarketingSmtpConfig,
} from '../_shared/marketing-smtp.ts';
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
    const smtpAccountId = body.smtp_account_id?.trim() || null;
    const requestedRecipientIds = Array.isArray(body.recipient_user_ids)
      ? body.recipient_user_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const requestedRecipientEmails = parseRecipientEmails(body.recipient_emails);
    const templateName = body.template_name?.trim() || null;

    const validated = validateCampaignContent(body.subject?.trim() || '', body.html_body || '');
    const subject = validated.sanitizedSubject;
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || 'https://www.nexlogs.site').replace(
      /\/$/,
      '',
    );
    const appName = Deno.env.get('APP_NAME') || 'Nexlogs';
    const htmlTemplate = validated.sanitizedHtml;
    const smtp = await resolveMarketingSmtpConfig(adminClient, smtpAccountId);

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
      from: `${smtp.fromName} <${smtp.fromAddress}>`,
      smtp_account: smtp.label,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HTML campaign send failed';
    console.error('[send-admin-html-campaign]', message);
    return jsonResponse({ error: message }, 500);
  }
});
