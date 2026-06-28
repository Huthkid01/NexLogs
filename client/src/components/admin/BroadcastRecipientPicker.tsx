import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BroadcastContact {
  id: string;
  email: string;
  fullName: string;
}

interface BroadcastRecipientPickerProps {
  contacts: BroadcastContact[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  selectedExternalEmails?: string[];
  onExternalEmailsChange?: (emails: string[]) => void;
  loading?: boolean;
  variant?: 'default' | 'composer';
  showCcToggle?: boolean;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitRecipientTokens(value: string) {
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findContactByToken(
  token: string,
  contacts: BroadcastContact[],
  selectedIds: string[],
  filteredContacts: BroadcastContact[],
  allowSingleSuggestion = true,
): BroadcastContact | null {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return null;

  const available = contacts.filter((contact) => !selectedIds.includes(contact.id));

  const exactEmail = available.find((contact) => contact.email.toLowerCase() === normalized);
  if (exactEmail) return exactEmail;

  const exactName = available.find(
    (contact) => contact.fullName.trim().toLowerCase() === normalized,
  );
  if (exactName) return exactName;

  if (EMAIL_PATTERN.test(normalized)) {
    return null;
  }

  const nameMatches = available.filter((contact) =>
    contact.fullName.toLowerCase().includes(normalized),
  );
  if (nameMatches.length === 1) return nameMatches[0];

  if (allowSingleSuggestion && filteredContacts.length === 1) return filteredContacts[0];

  return null;
}

export function BroadcastRecipientPicker({
  contacts,
  selectedIds,
  onChange,
  selectedExternalEmails = [],
  onExternalEmailsChange,
  loading = false,
  variant = 'default',
  showCcToggle = false,
}: BroadcastRecipientPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [ccOpen, setCcOpen] = useState(false);

  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selectedIds.includes(contact.id)),
    [contacts, selectedIds],
  );

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return contacts
      .filter((contact) => !selectedIds.includes(contact.id))
      .filter((contact) => {
        if (!normalized) return true;
        return (
          contact.email.toLowerCase().includes(normalized) ||
          contact.fullName.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 50);
  }, [contacts, query, selectedIds]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const addContact = (contactId: string) => {
    if (selectedIds.includes(contactId)) return;
    onChange([...selectedIds, contactId]);
    setQuery('');
    inputRef.current?.focus();
  };

  const isEmailAlreadySelected = (email: string) => {
    const normalized = normalizeEmail(email);
    if (selectedExternalEmails.includes(normalized)) return true;
    return selectedContacts.some((contact) => normalizeEmail(contact.email) === normalized);
  };

  const addExternalEmail = (rawEmail: string, options?: { silent?: boolean }) => {
    const normalized = normalizeEmail(rawEmail);
    if (!EMAIL_PATTERN.test(normalized)) {
      if (!options?.silent) toast.error('Enter a valid email address');
      return false;
    }
    if (isEmailAlreadySelected(normalized)) return false;
    if (!onExternalEmailsChange) {
      if (!options?.silent) toast.error('External email addresses are not enabled for this picker.');
      return false;
    }
    onExternalEmailsChange([...selectedExternalEmails, normalized]);
    setQuery('');
    inputRef.current?.focus();
    return true;
  };

  const addFromQuery = (rawQuery: string, options?: { silent?: boolean }) => {
    const tokens = splitRecipientTokens(rawQuery);
    if (!tokens.length) return false;

    const nextIds = [...selectedIds];
    const nextExternalEmails = [...selectedExternalEmails];
    let added = 0;

    for (const token of tokens) {
      const contact = findContactByToken(
        token,
        contacts,
        nextIds,
        filteredContacts,
        tokens.length === 1,
      );

      if (contact) {
        if (!nextIds.includes(contact.id)) {
          nextIds.push(contact.id);
          added += 1;
        }
        continue;
      }

      const normalized = normalizeEmail(token);
      if (EMAIL_PATTERN.test(normalized)) {
        if (nextExternalEmails.includes(normalized)) continue;
        if (nextIds.some((id) => {
          const match = contacts.find((entry) => entry.id === id);
          return match && normalizeEmail(match.email) === normalized;
        })) {
          continue;
        }
        if (onExternalEmailsChange) {
          nextExternalEmails.push(normalized);
          added += 1;
        } else if (!options?.silent) {
          toast.error(`No eligible contact found for ${normalized}`);
        }
        continue;
      }

      if (!options?.silent) {
        toast.error(`No matching contact for "${token.trim()}". Press Enter when one result is shown.`);
      }
    }

    if (added > 0) {
      if (nextIds.length !== selectedIds.length) onChange(nextIds);
      if (onExternalEmailsChange && nextExternalEmails.length !== selectedExternalEmails.length) {
        onExternalEmailsChange(nextExternalEmails);
      }
      setQuery('');
      inputRef.current?.focus();
      return true;
    }

    return false;
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      if (!query.trim()) return;
      event.preventDefault();
      addFromQuery(query);
      return;
    }

    if (event.key === 'Backspace' && !query) {
      if (selectedExternalEmails.length) {
        onExternalEmailsChange?.(selectedExternalEmails.slice(0, -1));
        return;
      }
      if (selectedIds.length) {
        onChange(selectedIds.slice(0, -1));
      }
    }
  };

  const handleInputPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    const tokens = splitRecipientTokens(pasted);
    if (tokens.length <= 1) return;

    event.preventDefault();
    addFromQuery(tokens.join(','));
  };

  const removeContact = (contactId: string) => {
    onChange(selectedIds.filter((id) => id !== contactId));
  };

  const removeExternalEmail = (email: string) => {
    onExternalEmailsChange?.(selectedExternalEmails.filter((entry) => entry !== email));
  };

  const selectAll = () => {
    onChange(contacts.map((contact) => contact.id));
    setOpen(false);
    setQuery('');
  };

  const clearAll = () => {
    onChange([]);
    onExternalEmailsChange?.([]);
    setQuery('');
    inputRef.current?.focus();
  };

  const pendingContact = useMemo(
    () => (query.trim() ? findContactByToken(query, contacts, selectedIds, filteredContacts) : null),
    [contacts, filteredContacts, query, selectedIds],
  );

  const pendingExternalEmail = useMemo(() => {
    const normalized = normalizeEmail(query);
    if (!EMAIL_PATTERN.test(normalized)) return null;
    if (pendingContact) return null;
    if (selectedExternalEmails.includes(normalized)) return null;
    if (
      contacts.some(
        (contact) => selectedIds.includes(contact.id) && normalizeEmail(contact.email) === normalized,
      )
    ) {
      return null;
    }
    return normalized;
  }, [contacts, pendingContact, query, selectedExternalEmails, selectedIds]);

  const totalSelectedCount = selectedIds.length + selectedExternalEmails.length;

  const listContacts = useMemo(() => {
    if (!pendingContact) return filteredContacts;
    return filteredContacts.filter((contact) => contact.id !== pendingContact.id);
  }, [filteredContacts, pendingContact]);

  const pickerField = (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <div
        className={cn(
          variant === 'composer'
            ? 'min-h-10 bg-transparent px-0 py-1'
            : 'min-h-11 rounded-lg border border-input bg-white px-2 py-2 dark:bg-dm-surface dark:border-dm-input-border',
          variant !== 'composer' && open && 'ring-2 ring-[#f26522]/30 border-[#f26522]/50',
        )}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedContacts.map((contact) => (
            <span
              key={contact.id}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                variant === 'composer'
                  ? 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200'
                  : 'bg-[#fff3eb] text-[#9a3412] dark:bg-[#f26522]/10 dark:text-[#fdba74]',
              )}
            >
              <span className="truncate">{contact.fullName || contact.email}</span>
              {variant !== 'composer' && (
                <span className="hidden text-[#b45309]/80 sm:inline">&lt;{contact.email}&gt;</span>
              )}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                onClick={(event) => {
                  event.stopPropagation();
                  removeContact(contact.id);
                }}
                aria-label={`Remove ${contact.email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedExternalEmails.map((email) => (
            <span
              key={`external-${email}`}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                variant === 'composer'
                  ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
              )}
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                onClick={(event) => {
                  event.stopPropagation();
                  removeExternalEmail(email);
                }}
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <div className={cn('flex min-w-[120px] flex-1 items-center gap-2', variant === 'composer' ? 'px-0' : 'px-1')}>
            {variant !== 'composer' && <Search className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <input
              ref={inputRef}
              id="recipient-search"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleInputKeyDown}
              onPaste={handleInputPaste}
              placeholder={
                totalSelectedCount
                  ? variant === 'composer'
                    ? 'Add email or contact, press Enter'
                    : 'Add email or contact, press Enter...'
                  : variant === 'composer'
                    ? 'Users or any email — press Enter'
                    : 'Search users or type any email, press Enter...'
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              disabled={loading}
            />
            {variant !== 'composer' && (
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full min-w-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#22324a] dark:bg-[#0b1628]">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-[#18263b]">
            <span className="text-xs font-medium text-slate-500">{contacts.length} contacts</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs font-medium text-[#f26522] hover:underline disabled:opacity-40"
                onClick={selectAll}
                disabled={loading || !contacts.length}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline disabled:opacity-40"
                onClick={clearAll}
                disabled={!totalSelectedCount}
              >
                Clear
              </button>
            </div>
          </div>

          {loading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Loading contacts...</p>
          ) : pendingContact ? (
            <button
              type="button"
              className="flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-[#18263b] dark:hover:bg-[#06101d]"
              onClick={() => addContact(pendingContact.id)}
            >
              <span className="text-sm font-medium text-[#f26522]">
                Add {pendingContact.fullName || pendingContact.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {pendingContact.email} · press Enter
              </span>
            </button>
          ) : pendingExternalEmail ? (
            <button
              type="button"
              className="flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-[#18263b] dark:hover:bg-[#06101d]"
              onClick={() => addExternalEmail(pendingExternalEmail)}
            >
              <span className="text-sm font-medium text-[#f26522]">Add external email</span>
              <span className="text-xs text-muted-foreground">
                {pendingExternalEmail} · press Enter
              </span>
            </button>
          ) : null}

          {loading ? null : listContacts.length === 0 && !pendingContact && !pendingExternalEmail ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {query.trim()
                ? EMAIL_PATTERN.test(query.trim())
                  ? 'Press Enter to add this email address.'
                  : 'No matching contacts found.'
                : 'All contacts are already selected.'}
            </p>
          ) : (
            listContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-[#06101d]"
                onClick={() => addContact(contact.id)}
              >
                <span className="text-sm font-medium">{contact.fullName || contact.email}</span>
                <span className="text-xs text-muted-foreground">{contact.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'composer') {
    return (
      <div className="flex min-w-0 items-start gap-3 border-b border-slate-100 px-4 py-2 dark:border-[#18263b]">
        <span className="w-14 shrink-0 pt-2 text-sm text-slate-500">To</span>
        <div className="min-w-0 flex-1">
          {pickerField}
          {showCcToggle && ccOpen && (
            <div className="mt-2 flex items-start gap-3 border-t border-slate-100 pt-2 dark:border-[#18263b]">
              <span className="w-14 shrink-0 text-sm text-slate-500">Info</span>
              <p className="text-xs leading-relaxed text-slate-500">
                Product links are included automatically. Recipients who are not signed in will be asked to log in first, then taken to the product.
              </p>
            </div>
          )}
        </div>
        {showCcToggle && (
          <button
            type="button"
            onClick={() => setCcOpen((value) => !value)}
            className="shrink-0 pt-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cc / Bcc
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label htmlFor="recipient-search">To</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick registered users or type any email address and press Enter. External addresses include an
            unsubscribe link. Admins are not shown in contacts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={selectAll} disabled={loading || !contacts.length}>
            Select all ({contacts.length})
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearAll} disabled={!selectedIds.length}>
            Clear
          </Button>
        </div>
      </div>

      {pickerField}

      <p className="text-xs text-muted-foreground">
        {totalSelectedCount} recipient{totalSelectedCount === 1 ? '' : 's'} selected
        {selectedExternalEmails.length > 0 ? ` (${selectedExternalEmails.length} external)` : ''}
        {contacts.length ? ` · ${contacts.length} registered contacts available` : ''}
      </p>
    </div>
  );
}
