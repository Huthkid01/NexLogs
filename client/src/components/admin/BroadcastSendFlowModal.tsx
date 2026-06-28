import { useEffect } from 'react';
import { Check, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
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
  onConfirmSend: () => void;
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
  onConfirmSend,
  onClose,
}: BroadcastSendFlowModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!open || phase !== 'success') return;

    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [open, phase, onClose]);

  if (!open) return null;

  const canDismiss = phase === 'confirm' || phase === 'success' || phase === 'error';
  const backdropClose = phase === 'confirm' || phase === 'success';

  return (
    <div className={adminModalOverlayClass(isDark)}>
      {backdropClose && (
        <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" />
      )}

      <div
        className={cn(
          'relative z-10 w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl',
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
              </div>
              <button type="button" onClick={onClose} className={adminIconButtonClass(isDark)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className={adminOutlineButtonClass(isDark)} onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]" onClick={onConfirmSend}>
                Send emails
              </Button>
            </div>
          </>
        )}

        {phase === 'sending' && (
          <div className="px-6 py-8 text-center">
            <div
              className={cn(
                'mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border',
                isDark ? 'border-[#22324a] bg-[#0b1628]' : 'border-slate-200 bg-slate-50',
              )}
            >
              <Mail className="h-7 w-7 animate-pulse text-[#7c3aed]" />
            </div>
            <p className="text-lg font-semibold">Sending emails…</p>
            <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>
              Delivering to {sendCount} recipient{sendCount === 1 ? '' : 's'}. Please wait.
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-[#18263b]">
              <div className="broadcast-send-progress h-full w-1/3 rounded-full bg-[#7c3aed]" />
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </div>
            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">Send done</p>
            <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>
              {failedCount > 0
                ? `Sent ${sentCount} of ${sendCount} emails. ${failedCount} failed.`
                : `Announcement sent to ${sentCount} contact${sentCount === 1 ? '' : 's'}.`}
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

        {!canDismiss && phase === 'sending' && (
          <p className="sr-only" role="status" aria-live="polite">
            Sending emails
          </p>
        )}
      </div>
    </div>
  );
}
