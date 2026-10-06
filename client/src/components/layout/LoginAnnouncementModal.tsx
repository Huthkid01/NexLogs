import { Megaphone, X } from 'lucide-react';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { useModalLock } from '@/hooks/useModalLock';
import { LOGIN_ANNOUNCEMENT } from '@/lib/login-announcement';

interface LoginAnnouncementModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginAnnouncementModal({ open, onClose }: LoginAnnouncementModalProps) {
  useModalLock(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close announcement"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-announcement-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dm-surface"
      >
        <div className="relative bg-gradient-to-br from-[#fff4ee] via-white to-[#fffaf5] px-6 pb-5 pt-6 dark:from-[#2a1a12] dark:via-dm-surface dark:to-[#1a140f]">
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
            <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e8] text-[#f26522] dark:bg-[#f26522]/15">
              <Megaphone className="h-6 w-6" />
            </div>
            <h2
              id="login-announcement-title"
              className="mt-4 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl"
            >
              {LOGIN_ANNOUNCEMENT.title}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {LOGIN_ANNOUNCEMENT.body}
            </p>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <a
            href={LOGIN_ANNOUNCEMENT.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl bg-[#f26522] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#d94e0f]"
          >
            {LOGIN_ANNOUNCEMENT.ctaLabel}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full pt-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
