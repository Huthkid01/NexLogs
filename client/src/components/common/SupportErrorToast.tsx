import { X } from 'lucide-react';
import { toast } from 'sonner';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { DEFAULT_TELEGRAM_SUPPORT_URL } from '@/lib/telegram-url';

export interface SupportErrorToastRequest {
  title: string;
  message?: string;
}

function SupportErrorToastCard({
  toastId,
  title,
  message,
  telegramUrl,
}: {
  toastId: string | number;
  title: string;
  message: string;
  telegramUrl: string;
}) {
  return (
    <div className="relative pointer-events-auto w-[min(100vw-1.5rem,420px)] overflow-hidden rounded-2xl border border-[#2a3548] bg-[#121821] text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1c2433] px-1">
          <NexLogsLogo className="h-5" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-semibold leading-snug text-white">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[#243044] px-4 py-3">
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="rounded-lg border border-slate-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5"
        >
          Not now
        </button>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => toast.dismiss(toastId)}
          className="rounded-lg bg-[#f26522] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d94e0f]"
        >
          Telegram support
        </a>
      </div>
    </div>
  );
}

/** Bottom card error prompt with Telegram support CTA. */
export function showSupportErrorToast(
  request: SupportErrorToastRequest,
  telegramUrl = DEFAULT_TELEGRAM_SUPPORT_URL,
) {
  const message =
    request.message?.trim() || 'Something went wrong. Contact Telegram support if you need help.';
  const title = request.title?.trim() || 'Something went wrong';

  toast.custom(
    (toastId) => (
      <SupportErrorToastCard
        toastId={toastId}
        title={title}
        message={message}
        telegramUrl={telegramUrl}
      />
    ),
    {
      position: 'bottom-center',
      duration: 10_000,
      unstyled: true,
    },
  );
}
