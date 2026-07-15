import { X } from 'lucide-react';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { useModalLock } from '@/hooks/useModalLock';
import { COMMUNITY_LINKS } from '@/lib/community-promo';

interface CommunityPromoModalProps {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.5A4.25 4.25 0 003.5 7.75v8.5A4.25 4.25 0 007.75 20.5h8.5a4.25 4.25 0 004.25-4.25v-8.5A4.25 4.25 0 0016.25 3.5h-8.5zm8.75 1.75a1 1 0 110 2 1 1 0 010-2zM12 7a5 5 0 110 10 5 5 0 010-10zm0 1.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
    </svg>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 013.15 15.4a6.34 6.34 0 0010.9 4.4c.04-.06.08-.11.11-.17a6.3 6.3 0 00.92-3.25V8.37a8.16 8.16 0 004.76 1.52V6.42a4.85 4.85 0 01-1.25.27z" />
    </svg>
  );
}

export function CommunityPromoModal({ open, onClose, onJoined }: CommunityPromoModalProps) {
  useModalLock(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close community promo"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-promo-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dm-surface"
      >
        <div className="relative bg-gradient-to-br from-[#fff4ee] via-white to-[#e8f8ef] px-6 pb-5 pt-6 dark:from-[#2a1a12] dark:via-dm-surface dark:to-[#122018]">
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
            <h2
              id="community-promo-title"
              className="mt-4 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl"
            >
              Join our community
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Get updates, deals, and support. Join our WhatsApp community and follow us on TikTok and
              Instagram.
            </p>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <a
            href={COMMUNITY_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onJoined}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe57]"
          >
            <WhatsAppGlyph className="h-5 w-5" />
            Join our WhatsApp community
          </a>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={COMMUNITY_LINKS.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onJoined}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
            >
              <TikTokGlyph className="h-4 w-4" />
              Follow on TikTok
            </a>
            <a
              href={COMMUNITY_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onJoined}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            >
              <InstagramGlyph className="h-4 w-4" />
              Follow on Instagram
            </a>
          </div>

          <button
            type="button"
            onClick={onJoined}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-dm-border dark:bg-dm-surface dark:text-gray-100 dark:hover:bg-dm-bg"
          >
            I&apos;ve already joined
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full pt-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
