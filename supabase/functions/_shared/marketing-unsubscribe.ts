import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AdminClient = SupabaseClient;

export function normalizeMarketingEmail(value: string) {
  return value.trim().toLowerCase();
}

export function buildPublicUnsubscribeUrl(appUrl: string, token: string) {
  return `${appUrl.replace(/\/$/, '')}/unsubscribe/${token}`;
}

export function buildOneClickUnsubscribeUrl(supabaseUrl: string, token: string) {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/functions/v1/process-marketing-unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildUnsubscribeFooterHtml(
  unsubscribeUrl: string,
  appName: string,
  options?: { isAccountHolder?: boolean },
) {
  const reason = options?.isAccountHolder === false
    ? `You received this marketing email from ${appName}.`
    : `You received this because you have an account on ${appName}.`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
  <tr>
    <td style="font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
      ${reason}<br/>
      <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from promotional emails</a>
    </td>
  </tr>
</table>`;
}

export function buildUnsubscribeFooterText(unsubscribeUrl: string) {
  return `\n\n---\nUnsubscribe from promotional emails: ${unsubscribeUrl}`;
}

export function appendUnsubscribeToHtml(
  html: string,
  unsubscribeUrl: string,
  appName: string,
  options?: { isAccountHolder?: boolean },
) {
  const footer = buildUnsubscribeFooterHtml(unsubscribeUrl, appName, options);
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return `${html}${footer}`;
}

export function appendUnsubscribeToText(text: string, unsubscribeUrl: string) {
  return `${text}${buildUnsubscribeFooterText(unsubscribeUrl)}`;
}

export async function getUnsubscribedUserIds(
  adminClient: AdminClient,
  userIds: string[],
): Promise<Set<string>> {
  if (!userIds.length) return new Set();

  const { data, error } = await adminClient
    .from('marketing_email_unsubscribes')
    .select('user_id')
    .in('user_id', userIds);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.user_id as string));
}

export async function getUnsubscribedEmails(
  adminClient: AdminClient,
  emails: string[],
): Promise<Set<string>> {
  const normalized = [...new Set(emails.map((email) => normalizeMarketingEmail(email)).filter(Boolean))];
  if (!normalized.length) return new Set();

  const { data, error } = await adminClient
    .from('marketing_email_unsubscribes')
    .select('email')
    .in('email', normalized);

  if (error) throw error;

  return new Set((data ?? []).map((row) => normalizeMarketingEmail(row.email as string)));
}

export async function getUnsubscribeTokensForUsers(
  adminClient: AdminClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const tokenMap = new Map<string, string>();
  if (!userIds.length) return tokenMap;

  const { data: existing, error: existingError } = await adminClient
    .from('marketing_email_unsubscribe_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  if (existingError) throw existingError;

  for (const row of existing ?? []) {
    tokenMap.set(row.user_id as string, row.token as string);
  }

  const missing = userIds.filter((userId) => !tokenMap.has(userId));
  for (const userId of missing) {
    const { data: created, error: createError } = await adminClient
      .from('marketing_email_unsubscribe_tokens')
      .insert({ user_id: userId })
      .select('user_id, token')
      .single();

    if (createError) {
      const { data: retry, error: retryError } = await adminClient
        .from('marketing_email_unsubscribe_tokens')
        .select('user_id, token')
        .eq('user_id', userId)
        .single();

      if (retryError || !retry?.token) throw createError;
      tokenMap.set(retry.user_id as string, retry.token as string);
      continue;
    }

    if (created?.token) {
      tokenMap.set(created.user_id as string, created.token as string);
    }
  }

  return tokenMap;
}

export async function getUnsubscribeTokensForEmails(
  adminClient: AdminClient,
  emails: string[],
): Promise<Map<string, string>> {
  const tokenMap = new Map<string, string>();
  const normalized = [...new Set(emails.map((email) => normalizeMarketingEmail(email)).filter(Boolean))];
  if (!normalized.length) return tokenMap;

  const { data: existing, error: existingError } = await adminClient
    .from('marketing_external_unsubscribe_tokens')
    .select('email, token')
    .in('email', normalized);

  if (existingError) throw existingError;

  for (const row of existing ?? []) {
    tokenMap.set(normalizeMarketingEmail(row.email as string), row.token as string);
  }

  const missing = normalized.filter((email) => !tokenMap.has(email));
  for (const email of missing) {
    const { data: created, error: createError } = await adminClient
      .from('marketing_external_unsubscribe_tokens')
      .insert({ email })
      .select('email, token')
      .single();

    if (createError) {
      const { data: retry, error: retryError } = await adminClient
        .from('marketing_external_unsubscribe_tokens')
        .select('email, token')
        .eq('email', email)
        .single();

      if (retryError || !retry?.token) throw createError;
      tokenMap.set(normalizeMarketingEmail(retry.email as string), retry.token as string);
      continue;
    }

    if (created?.token) {
      tokenMap.set(normalizeMarketingEmail(created.email as string), created.token as string);
    }
  }

  return tokenMap;
}
