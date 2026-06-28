import { useState } from 'react';
import { Mail, Users, X } from 'lucide-react';
import { BroadcastEmailPreview } from '@/components/admin/BroadcastEmailPreview';
import { EmailSendRecipientsPanel } from '@/components/admin/EmailSendRecipientsPanel';
import type { BroadcastContact } from '@/components/admin/BroadcastRecipientPicker';
import { useTheme } from '@/hooks/useTheme';
import { adminIconButtonClass, adminModalOverlayClass } from '@/lib/admin-theme';
import { cn } from '@/lib/utils';

interface BroadcastPreviewModalProps {
  open: boolean;
  onClose: () => void;
  subject: string;
  customMessage: string;
  products: Array<{ title: string; slug: string; price: number }>;
  title?: string;
  description?: string;
  recipientUserIds?: string[];
  recipientEmails?: string[];
  contacts?: BroadcastContact[];
  failedCount?: number;
  onSelectMissingRecipients?: (ids: string[]) => void;
}

export function BroadcastPreviewModal({
  open,
  onClose,
  subject,
  customMessage,
  products,
  title = 'Email preview',
  description = 'How recipients will see this announcement in their inbox.',
  recipientUserIds = [],
  recipientEmails = [],
  contacts = [],
  failedCount = 0,
  onSelectMissingRecipients,
}: BroadcastPreviewModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<'preview' | 'recipients'>('preview');

  if (!open) return null;

  return (
    <div className={adminModalOverlayClass(isDark)}>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close preview" />

      <div
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl',
          isDark ? 'border-[#1f2e46] bg-[#081324] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
        )}
      >
        <div className="flex items-center justify-between border-b px-5 py-4 dark:border-[#18263b]">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <button type="button" onClick={onClose} className={adminIconButtonClass(isDark)} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b px-5 py-2 dark:border-[#18263b]">
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === 'preview'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                : 'text-muted-foreground hover:bg-muted/60',
            )}
          >
            <Mail className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab('recipients')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === 'recipients'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                : 'text-muted-foreground hover:bg-muted/60',
            )}
          >
            <Users className="h-4 w-4" />
            Recipients
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === 'preview' ? (
            <BroadcastEmailPreview
              subject={subject}
              customMessage={customMessage}
              products={products}
            />
          ) : (
            <EmailSendRecipientsPanel
              recipientUserIds={recipientUserIds}
              recipientEmails={recipientEmails}
              contacts={contacts}
              failedCount={failedCount}
              onSelectMissing={onSelectMissingRecipients}
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </div>
  );
}
