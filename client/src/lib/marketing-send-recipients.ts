import type { BroadcastContact } from '@/components/admin/BroadcastRecipientPicker';

export type RecipientSendStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface MarketingSendRecipient {
  email: string;
  userId?: string;
  displayName: string;
}

export interface MarketingSendProgressItem extends MarketingSendRecipient {
  status: RecipientSendStatus;
  error?: string;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function resolveMarketingSendRecipients(
  contacts: BroadcastContact[],
  userIds: string[],
  externalEmails: string[],
  sendToAll: boolean,
): MarketingSendRecipient[] {
  const seen = new Set<string>();
  const result: MarketingSendRecipient[] = [];

  const add = (item: MarketingSendRecipient) => {
    const email = normalizeEmail(item.email);
    if (!email || seen.has(email)) return;
    seen.add(email);
    result.push({ ...item, email });
  };

  if (sendToAll) {
    for (const contact of contacts) {
      add({
        email: contact.email,
        userId: contact.id,
        displayName: contact.fullName,
      });
    }
    return result;
  }

  for (const id of userIds) {
    const contact = contacts.find((entry) => entry.id === id);
    if (contact) {
      add({
        email: contact.email,
        userId: contact.id,
        displayName: contact.fullName,
      });
    }
  }

  for (const raw of externalEmails) {
    const email = normalizeEmail(raw);
    if (!email) continue;

    const contact = contacts.find((entry) => normalizeEmail(entry.email) === email);
    if (contact) {
      add({
        email: contact.email,
        userId: contact.id,
        displayName: contact.fullName,
      });
      continue;
    }

    add({
      email,
      displayName: email.split('@')[0],
    });
  }

  return result;
}

export function createSendProgressItems(recipients: MarketingSendRecipient[]): MarketingSendProgressItem[] {
  return recipients.map((recipient) => ({
    ...recipient,
    status: 'pending',
  }));
}
