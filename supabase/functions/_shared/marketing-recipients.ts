import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getUnsubscribedEmails,
  getUnsubscribedUserIds,
  getUnsubscribeTokensForEmails,
  getUnsubscribeTokensForUsers,
  normalizeMarketingEmail,
} from './marketing-unsubscribe.ts';

type AdminClient = SupabaseClient;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProfileRecipient {
  id: string;
  email: string;
  full_name: string | null;
}

export interface MarketingRecipient {
  email: string;
  fullName: string;
  userId: string | null;
  isExternal: boolean;
}

export interface ResolvedMarketingRecipients {
  recipients: MarketingRecipient[];
  userIds: string[];
  externalEmails: string[];
  totalEligibleUsers: number;
}

export function parseRecipientEmails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const emails: string[] = [];

  for (const value of raw) {
    const normalized = normalizeMarketingEmail(String(value));
    if (!normalized || !EMAIL_PATTERN.test(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    emails.push(normalized);
  }

  return emails;
}

export async function resolveMarketingRecipients(
  adminClient: AdminClient,
  options: {
    sendToAll: boolean;
    recipientUserIds: string[];
    recipientEmails: string[];
  },
): Promise<{ data?: ResolvedMarketingRecipients; error?: string }> {
  const { sendToAll, recipientUserIds, recipientEmails } = options;

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('is_suspended', false)
    .neq('role', 'admin')
    .not('email', 'is', null)
    .order('created_at', { ascending: true });

  if (profilesError) throw profilesError;

  const uniqueProfiles = Array.from(
    new Map(
      (profiles ?? [])
        .filter((profile) => profile.email?.trim())
        .map((profile) => [normalizeMarketingEmail(profile.email), profile as ProfileRecipient]),
    ).values(),
  );

  if (!uniqueProfiles.length && !recipientEmails.length && !sendToAll && !recipientUserIds.length) {
    return { error: 'Select at least one recipient in the To field' };
  }

  const unsubscribedUserIds = await getUnsubscribedUserIds(
    adminClient,
    uniqueProfiles.map((profile) => profile.id),
  );
  const eligibleProfiles = uniqueProfiles.filter((profile) => !unsubscribedUserIds.has(profile.id));
  const totalEligibleUsers = eligibleProfiles.length;

  let targetProfiles = eligibleProfiles;
  if (!sendToAll && recipientUserIds.length) {
    const selectedSet = new Set(recipientUserIds);
    targetProfiles = eligibleProfiles.filter((profile) => selectedSet.has(profile.id));
  } else if (!sendToAll && recipientEmails.length) {
    const emailSet = new Set(recipientEmails);
    targetProfiles = eligibleProfiles.filter((profile) =>
      emailSet.has(normalizeMarketingEmail(profile.email))
    );
  } else if (!sendToAll) {
    targetProfiles = [];
  }

  const profileEmails = new Set(targetProfiles.map((profile) => normalizeMarketingEmail(profile.email)));
  const externalCandidates = recipientEmails.filter((email) => !profileEmails.has(email));

  const unsubscribedEmails = await getUnsubscribedEmails(adminClient, [
    ...targetProfiles.map((profile) => normalizeMarketingEmail(profile.email)),
    ...externalCandidates,
  ]);

  const userRecipients: MarketingRecipient[] = targetProfiles
    .filter((profile) => !unsubscribedEmails.has(normalizeMarketingEmail(profile.email)))
    .map((profile) => {
      const email = normalizeMarketingEmail(profile.email);
      return {
        email,
        fullName: profile.full_name?.trim() || email.split('@')[0],
        userId: profile.id,
        isExternal: false,
      };
    });

  const externalRecipients: MarketingRecipient[] = externalCandidates
    .filter((email) => !unsubscribedEmails.has(email))
    .map((email) => ({
      email,
      fullName: email.split('@')[0],
      userId: null,
      isExternal: true,
    }));

  const recipients = [...userRecipients, ...externalRecipients];

  if (!recipients.length) {
    if (recipientUserIds.length || recipientEmails.length) {
      return { error: 'Selected recipients are not eligible or have unsubscribed from promotional emails' };
    }
    return { error: 'Select at least one recipient in the To field' };
  }

  return {
    data: {
      recipients,
      userIds: userRecipients.map((recipient) => recipient.userId as string),
      externalEmails: externalRecipients.map((recipient) => recipient.email),
      totalEligibleUsers,
    },
  };
}

export async function loadUnsubscribeTokensForRecipients(
  adminClient: AdminClient,
  recipients: MarketingRecipient[],
): Promise<Map<string, string>> {
  const tokenByEmail = new Map<string, string>();

  const userIds = recipients.filter((recipient) => recipient.userId).map((recipient) => recipient.userId as string);
  const externalEmails = recipients.filter((recipient) => recipient.isExternal).map((recipient) => recipient.email);

  const [userTokens, externalTokens] = await Promise.all([
    getUnsubscribeTokensForUsers(adminClient, userIds),
    getUnsubscribeTokensForEmails(adminClient, externalEmails),
  ]);

  for (const recipient of recipients) {
    if (recipient.userId) {
      const token = userTokens.get(recipient.userId);
      if (token) tokenByEmail.set(recipient.email, token);
      continue;
    }

    const token = externalTokens.get(recipient.email);
    if (token) tokenByEmail.set(recipient.email, token);
  }

  return tokenByEmail;
}
