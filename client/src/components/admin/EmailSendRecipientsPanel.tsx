import { useMemo, useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BroadcastContact } from '@/components/admin/BroadcastRecipientPicker';
import { cn } from '@/lib/utils';

interface EmailSendRecipientsPanelProps {
  recipientUserIds: string[];
  recipientEmails?: string[];
  contacts: BroadcastContact[];
  failedCount?: number;
  onSelectMissing?: (ids: string[]) => void;
  isDark?: boolean;
}

export function EmailSendRecipientsPanel({
  recipientUserIds,
  recipientEmails = [],
  contacts,
  failedCount = 0,
  onSelectMissing,
  isDark = false,
}: EmailSendRecipientsPanelProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'sent' | 'missing'>('sent');

  const recipientSet = useMemo(() => new Set(recipientUserIds), [recipientUserIds]);
  const contactById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);

  const sentContacts = useMemo(() => {
    const fromUsers = recipientUserIds
      .map((id) => contactById.get(id))
      .filter((contact): contact is BroadcastContact => Boolean(contact));

    const fromExternal = recipientEmails.map((email) => ({
      id: `external:${email}`,
      email,
      fullName: email.split('@')[0],
    }));

    return [...fromUsers, ...fromExternal];
  }, [recipientUserIds, recipientEmails, contactById]);

  const missingContacts = useMemo(() => {
    return contacts.filter((contact) => !recipientSet.has(contact.id));
  }, [contacts, recipientSet]);

  const activeList = view === 'sent' ? sentContacts : missingContacts;

  const filteredList = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return activeList;
    return activeList.filter(
      (contact) =>
        contact.email.toLowerCase().includes(normalized) ||
        contact.fullName.toLowerCase().includes(normalized),
    );
  }, [activeList, query]);

  const hasRecipientLog = recipientUserIds.length > 0 || recipientEmails.length > 0;

  return (
    <div className="flex h-full min-h-[320px] flex-col gap-4">
      {!hasRecipientLog ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
          Recipient list was not recorded for this send. Future sends will show who received the email
          so you can follow up with new signups.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setView('sent')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'sent'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <Users className="h-4 w-4" />
              Sent to ({sentContacts.length})
            </button>
            <button
              type="button"
              onClick={() => setView('missing')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'missing'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <UserPlus className="h-4 w-4" />
              Not yet sent ({missingContacts.length})
            </button>
            {failedCount > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {failedCount} delivery failure{failedCount === 1 ? '' : 's'} reported
              </span>
            )}
          </div>

          {view === 'missing' && missingContacts.length > 0 && onSelectMissing && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                These users signed up after your last send or were not included. Load them in the composer
                to resend this message.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-300 bg-white hover:bg-amber-100 dark:border-amber-800 dark:bg-transparent"
                onClick={() => onSelectMissing(missingContacts.map((contact) => contact.id))}
              >
                Add {missingContacts.length} to To field
              </Button>
            </div>
          )}

          {view === 'missing' && missingContacts.length === 0 && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              Every current contact has received this email.
            </p>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              className={cn(
                'w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                isDark
                  ? 'border-[#22324a] bg-[#0b1728] text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
              )}
            />
          </div>

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto rounded-xl border',
              isDark ? 'border-[#22324a] bg-[#0b1728]' : 'border-slate-200 bg-slate-50',
            )}
          >
            {filteredList.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              <ul className="divide-y dark:divide-[#22324a]">
                {filteredList.map((contact) => (
                  <li key={contact.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium">{contact.fullName}</span>
                    <span className="text-sm text-muted-foreground">{contact.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
