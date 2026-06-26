import { useEffect, useState } from 'react';
import { ChevronUp, MessageCircle } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { getTelegramSupportUrl } from '@/lib/telegram-url';

const SCROLL_THRESHOLD = 200;

export function FloatingActions() {
  const { content } = useSiteContent();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const telegramUrl = getTelegramSupportUrl(content);

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

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-40 flex flex-col items-center gap-3">
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f26522] text-white shadow-lg transition-colors hover:bg-[#d94e0f]"
        >
          <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      )}

      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open Telegram support"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f26522] text-white shadow-lg transition-colors hover:bg-[#d94e0f]"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
      </a>
    </div>
  );
}
