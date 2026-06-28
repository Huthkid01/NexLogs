import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
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
  loading?: boolean;
  variant?: 'default' | 'composer';
  showCcToggle?: boolean;
}

export function BroadcastRecipientPicker({
  contacts,
  selectedIds,
  onChange,
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

  const removeContact = (contactId: string) => {
    onChange(selectedIds.filter((id) => id !== contactId));
  };

  const selectAll = () => {
    onChange(contacts.map((contact) => contact.id));
    setOpen(false);
    setQuery('');
  };

  const clearAll = () => {
    onChange([]);
    setQuery('');
    inputRef.current?.focus();
  };

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
                  ? 'bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200'
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
              placeholder={
                selectedIds.length
                  ? variant === 'composer'
                    ? 'Add recipients'
                    : 'Add more contacts...'
                  : variant === 'composer'
                    ? 'Recipients'
                    : 'Search users by name or email...'
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
                className="text-xs font-medium text-[#7c3aed] hover:underline disabled:opacity-40"
                onClick={selectAll}
                disabled={loading || !contacts.length}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline disabled:opacity-40"
                onClick={clearAll}
                disabled={!selectedIds.length}
              >
                Clear
              </button>
            </div>
          </div>

          {loading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Loading contacts...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {query.trim() ? 'No matching contacts found.' : 'All contacts are already selected.'}
            </p>
          ) : (
            filteredContacts.map((contact) => (
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
            Search and pick user emails like a contact list. Admins are not shown.
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
        {selectedIds.length} contact{selectedIds.length === 1 ? '' : 's'} selected
        {contacts.length ? ` out of ${contacts.length} eligible users` : ''}
      </p>
    </div>
  );
}
