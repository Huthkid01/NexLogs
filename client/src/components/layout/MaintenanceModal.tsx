import { Wrench } from 'lucide-react';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { useScrollLock } from '@/hooks/useScrollLock';

interface MaintenanceModalProps {
  open: boolean;
  title: string;
  message: string;
}

/** Full-site lock screen while maintenance mode is enabled. Not dismissible. */
export function MaintenanceModal({ open, title, message }: MaintenanceModalProps) {
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b1220] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-modal-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dm-surface"
      >
        <div className="relative bg-gradient-to-br from-[#fff4ee] via-white to-[#fff8f3] px-6 pb-5 pt-8 dark:from-[#2a1a12] dark:via-dm-surface dark:to-[#1a120c]">
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
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            The website will be available again when maintenance is finished.
          </p>
          <a
            href="https://telegram.me/nexlogs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f26522] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#d94e0f]"
          >
            Contact support on Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
