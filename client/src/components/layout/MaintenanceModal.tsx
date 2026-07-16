import { Wrench, X } from 'lucide-react';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { useModalLock } from '@/hooks/useModalLock';

interface MaintenanceModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function MaintenanceModal({ open, title, message, onClose }: MaintenanceModalProps) {
  useModalLock(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close maintenance notice"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-modal-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dm-surface"
      >
        <div className="relative bg-gradient-to-br from-[#fff4ee] via-white to-[#fff8f3] px-6 pb-5 pt-6 dark:from-[#2a1a12] dark:via-dm-surface dark:to-[#1a120c]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <NexLogsLogo className="h-9" />
            <span className="mt-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f26522]/15 text-[#f26522]">
              <Wrench className="h-6 w-6" />
            </span>
            <h2
              id="maintenance-modal-title"
              className="mt-4 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl"
            >
              {title}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {message}
            </p>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <a
            href="https://telegram.me/nexlogs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f26522] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#d94e0f]"
          >
            Contact support on Telegram
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-dm-border dark:bg-dm-surface dark:text-gray-100 dark:hover:bg-dm-bg"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
