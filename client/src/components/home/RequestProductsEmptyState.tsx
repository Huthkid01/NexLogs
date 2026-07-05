import { MessageCircle, Send } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { getWhatsAppSupportUrl } from '@/lib/social-links';
import { getTelegramSupportUrl } from '@/lib/telegram-url';

export function RequestProductsEmptyState() {
  const { content } = useSiteContent();
  const telegramUrl = getTelegramSupportUrl(content);
  const whatsappUrl = getWhatsAppSupportUrl(content);

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-dm-border dark:bg-dm-surface">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {content.home.emptyCatalogTitle}
      </h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {content.home.emptyCatalogDescription}
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b8bc4]"
        >
          <Send className="h-4 w-4" />
          {content.home.requestOnTelegramLabel}
        </a>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe57]"
          >
            <MessageCircle className="h-4 w-4" />
            {content.home.requestOnWhatsAppLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
