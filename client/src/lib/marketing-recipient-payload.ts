import type { BroadcastContact } from '@/components/admin/BroadcastRecipientPicker';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function buildMarketingRecipientPayload(
  contacts: BroadcastContact[],
  selectedIds: string[],
  externalEmails: string[],
  sendToAll: boolean,
) {
  if (sendToAll) {
    return {
      recipient_user_ids: undefined,
      recipient_emails: undefined,
      send_to_all: true as const,
    };
  }

  const emailsFromContacts = selectedIds
    .map((id) => contacts.find((contact) => contact.id === id)?.email)
    .filter((email): email is string => Boolean(email?.trim()))
    .map((email) => normalizeEmail(email));

  const normalizedExternal = externalEmails.map((email) => normalizeEmail(email)).filter(Boolean);
  const recipientEmails = [...new Set([...emailsFromContacts, ...normalizedExternal])];

  return {
    recipient_user_ids: selectedIds.length ? selectedIds : undefined,
    recipient_emails: recipientEmails.length ? recipientEmails : undefined,
    send_to_all: false as const,
  };
}
