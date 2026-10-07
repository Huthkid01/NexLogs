import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, Phone } from 'lucide-react';
import { TelegramIcon } from '@/components/common/TelegramIcon';
import { LiveSupportCallModal } from '@/components/layout/LiveSupportCallModal';
import { useSiteContent } from '@/hooks/useSiteContent';
import { isLiveSupportCallEnabled } from '@/lib/live-support-call';
import { getTelegramSupportUrl } from '@/lib/telegram-url';

const SCROLL_THRESHOLD = 200;

export function FloatingActions() {
  const { content } = useSiteContent();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const telegramUrl = getTelegramSupportUrl(content);
  const liveCallEnabled = isLiveSupportCallEnabled();
  const [callOpen, setCallOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-4 z-[60] flex flex-col items-center gap-3 sm:right-6">
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f26522] text-white shadow-lg transition-colors hover:bg-[#d94e0f]"
          >
            <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}

        {/* Call support only appears when explicitly enabled — default site unchanged. */}
        {liveCallEnabled && (
          <button
            type="button"
            onClick={() => setCallOpen(true)}
            aria-label="Call support"
            className="pointer-events-auto flex w-[4.5rem] flex-col items-center gap-1 transition-transform hover:scale-105"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl">
              <Phone className="h-6 w-6" />
            </span>
            <span className="max-w-[4.75rem] text-center text-[9px] font-semibold leading-tight text-gray-700 dark:text-gray-200">
              Call support
            </span>
          </button>
        )}

        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Telegram support"
          className="telegram-float-btn pointer-events-auto flex w-[4.5rem] flex-col items-center gap-1 transition-transform hover:scale-105"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] shadow-xl">
            <TelegramIcon className="h-14 w-14 rounded-full" />
          </span>
          <span className="max-w-[4.75rem] text-center text-[9px] font-semibold leading-tight text-gray-700 dark:text-gray-200">
            Click here for support
          </span>
        </a>
      </div>

      {liveCallEnabled && (
        <LiveSupportCallModal open={callOpen} onClose={() => setCallOpen(false)} />
      )}
    </>,
    document.body,
  );
}
