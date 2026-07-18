import { Check, Loader2, Mail, PauseCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import type { MarketingSendProgressItem } from '@/lib/marketing-send-recipients';
import type { SequentialSendProgressInfo } from '@/lib/marketing-sequential-send';
import {
  adminIconButtonClass,
  adminMutedTextClass,
  adminModalOverlayClass,
  adminOutlineButtonClass,
} from '@/lib/admin-theme';
import { cn } from '@/lib/utils';

export type BroadcastSendPhase = 'confirm' | 'sending' | 'success' | 'error';

interface BroadcastSendFlowModalProps {
  open: boolean;
  phase: BroadcastSendPhase;
  sendCount: number;
  productCount?: number;
  sentCount?: number;
  failedCount?: number;
  errorMessage?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  sendProgress?: MarketingSendProgressItem[];
  currentSendEmail?: string | null;
  sendInfo?: SequentialSendProgressInfo | null;
  cancelled?: boolean;
  onConfirmSend: () => void;
  onCancelSend?: () => void;
  onClose: () => void;
}

export function BroadcastSendFlowModal({
  open,
  phase,
  sendCount,
  productCount,
  sentCount = 0,
  failedCount = 0,
  errorMessage,
  confirmTitle = 'Send product announcement?',
  confirmMessage,
  sendProgress = [],
  currentSendEmail = null,
  sendInfo = null,
  cancelled = false,
  onConfirmSend,
  onCancelSend,
  onClose,
}: BroadcastSendFlowModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!open) return null;

  // Only confirm can dismiss via backdrop. Success stays until Done.
  const backdropClose = phase === 'confirm';

  const totalRecipients = Math.max(sendCount, sendProgress.length, 1);
  const finishedCount = sendProgress.filter((item) => item.status === 'sent' || item.status === 'failed').length;
  const isPausing = phase === 'sending' && sendInfo?.mode === 'pausing';
  const isActivelySending = sendProgress.some((item) => item.status === 'sending');
  const progressValue = isPausing
    ? Math.min(100, (finishedCount / totalRecipients) * 100)
    : isActivelySending
      ? Math.min(99, ((finishedCount + 0.45) / totalRecipients) * 100)
      : Math.min(100, (finishedCount / totalRecipients) * 100);
  const progressPercent = Math.round(progressValue);
  const activeItem = sendProgress.find((item) => item.status === 'sending');
  const batchLabel =
    sendInfo && sendInfo.totalBatches > 1
      ? `Batch ${Math.min(sendInfo.batchNumber, sendInfo.totalBatches)} of ${sendInfo.totalBatches}`
      : null;

  return (
    <div className={adminModalOverlayClass(isDark, 'z-[85]')}>
      {backdropClose && (
        <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" />
      )}

      <div
        className={cn(
          'relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl',
          isDark ? 'border-[#1f2e46] bg-[#081324] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
        )}
      >
        {phase === 'confirm' && (
          <>
            <div className={cn('flex items-start justify-between gap-4 border-b px-6 py-5', isDark ? 'border-[#18263b]' : 'border-slate-200')}>
              <div>
                <h2 className="text-xl font-semibold">{confirmTitle}</h2>
                <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>
                  {confirmMessage ??
                    `This will email ${sendCount} selected contact${sendCount === 1 ? '' : 's'}${
                      productCount != null
                        ? ` about ${productCount} product${productCount === 1 ? '' : 's'}`
                        : ' with your HTML template'
                    } from support@nexlogs.store.`}
                </p>
                <p className={cn('mt-3 text-xs leading-5', adminMutedTextClass(isDark))}>
                  Emails are sent one by one like a mail client: 10 at a time, then a 5 second pause before the next batch. This improves delivery and inbox placement.
                </p>
              </div>
              <button type="button" onClick={onClose} className={adminIconButtonClass(isDark)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className={adminOutlineButtonClass(isDark)} onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" className="bg-[#f26522] text-white hover:bg-[#d94e0f]" onClick={onConfirmSend}>
                Send emails
              </Button>
            </div>
          </>
        )}

        {phase === 'sending' && (
          <div className="px-6 py-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f26522]/10 text-[#f26522]">
                {isPausing ? <PauseCircle className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
              </div>
              <p className="text-4xl font-bold tabular-nums text-[#f26522]">{progressPercent}%</p>
              <p className="mt-2 text-lg font-semibold">
                {isPausing ? 'Pausing before next batch…' : 'Sending emails…'}
              </p>
              <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>
                {finishedCount} of {totalRecipients} complete
                {batchLabel ? ` · ${batchLabel}` : ''}
              </p>
              {isPausing ? (
                <p className="mt-2 text-sm font-medium text-[#f26522]">
                  Waiting {sendInfo?.pauseSecondsLeft ?? 5}s, then sending the next 10…
                </p>
              ) : activeItem || currentSendEmail ? (
                <p className={cn('mt-2 truncate text-sm', adminMutedTextClass(isDark))}>
                  Sending to {activeItem?.email ?? currentSendEmail}
                </p>
              ) : null}
            </div>

            <div
              className="mt-5"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Email send progress"
            >
              <div className="mb-2 flex items-center justify-between text-xs font-medium">
                <span className={adminMutedTextClass(isDark)}>Outbox progress</span>
                <span className="tabular-nums text-[#f26522]">{progressPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-[#18263b]">
                <div
                  className="h-full rounded-full bg-[#f26522] transition-all duration-300"
                  style={{ width: `${Math.max(progressPercent, progressPercent > 0 ? 4 : 2)}%` }}
                />
              </div>
            </div>

            {sendProgress.length > 0 && (
              <ul className="mt-5 max-h-56 space-y-2 overflow-y-auto pr-1">
                {sendProgress.map((item) => (
                  <li
                    key={item.email}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm',
                      item.status === 'sending'
                        ? isDark
                          ? 'border-[#f26522]/40 bg-[#0f1c30]'
                          : 'border-orange-200 bg-orange-50'
                        : isDark
                          ? 'border-[#22324a] bg-[#0b1628]'
                          : 'border-slate-200 bg-slate-50',
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {item.status === 'sent' && (
                        <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                      )}
                      {item.status === 'failed' && (
                        <X className="h-4 w-4 text-red-500" aria-hidden="true" />
                      )}
                      {item.status === 'sending' && (
                        <Loader2 className="h-4 w-4 animate-spin text-[#f26522]" aria-hidden="true" />
                      )}
                      {item.status === 'pending' && (
                        <span className="block h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.email}</p>
                      {item.displayName && item.displayName !== item.email.split('@')[0] && (
                        <p className={cn('truncate text-xs', adminMutedTextClass(isDark))}>{item.displayName}</p>
                      )}
                      {item.status === 'failed' && item.error && (
                        <p className="mt-1 text-xs text-red-500">{item.error}</p>
                      )}
                      {item.status === 'sending' && (
                        <p className={cn('mt-1 text-xs', adminMutedTextClass(isDark))}>Sending now…</p>
                      )}
                      {item.status === 'sent' && (
                        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Delivered to mail server</p>
                      )}
                      {item.status === 'pending' && (
                        <p className={cn('mt-1 text-xs', adminMutedTextClass(isDark))}>Queued</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {onCancelSend && (
              <div className="mt-5 flex justify-center border-t pt-4 dark:border-[#18263b]">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(adminOutlineButtonClass(isDark), 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30')}
                  onClick={onCancelSend}
                >
                  Cancel sending
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === 'success' && (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </div>
            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
              {cancelled ? 'Sending cancelled' : 'Send done'}
            </p>
            <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>
              {cancelled
                ? `Stopped early. Sent ${sentCount} of ${sendCount} email${sendCount === 1 ? '' : 's'}${
                    failedCount > 0 ? ` (${failedCount} failed)` : ''
                  }. Remaining contacts were not emailed.`
                : failedCount > 0
                  ? `Sent ${sentCount} of ${sendCount} emails. ${failedCount} failed.`
                  : `Announcement sent to ${sentCount} contact${sentCount === 1 ? '' : 's'}.`}
            </p>
            <p className={cn('mt-3 text-xs', adminMutedTextClass(isDark))}>
              This window stays open until you click Done.
            </p>
            <Button type="button" className="mt-6 bg-emerald-600 text-white hover:bg-emerald-500" onClick={onClose}>
              Done
            </Button>
          </div>
        )}

        {phase === 'error' && (
          <>
            <div className="px-6 py-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-xl font-semibold text-red-700 dark:text-red-300">Send failed</p>
              <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>
                {errorMessage || 'Could not send the announcement. Try again.'}
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4 dark:border-[#18263b]">
              <Button type="button" variant="outline" className={adminOutlineButtonClass(isDark)} onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}

        {phase === 'sending' && (
          <p className="sr-only" role="status" aria-live="polite">
            {isPausing
              ? `Pausing ${sendInfo?.pauseSecondsLeft ?? 5} seconds before the next batch. ${progressPercent}% complete.`
              : activeItem
                ? `Sending email to ${activeItem.email}. ${progressPercent}% complete.`
                : `Sending emails. ${progressPercent}% complete. ${finishedCount} of ${totalRecipients}.`}
          </p>
        )}
      </div>
    </div>
  );
}
