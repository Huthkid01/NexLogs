import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/hooks/useSiteContent';
import { getTelegramSupportUrl } from '@/lib/telegram-url';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/utils';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { label: 'Marketplace', emoji: '🏠', href: '/marketplace', auth: true },
  { label: 'Purchase RDP', emoji: '🖥️', href: '/purchase-rdp', auth: true },
  { label: 'My Purchases', emoji: '🛒', href: '/purchases', auth: true },
  { label: 'Buy Numbers for SMS Verification', emoji: '📱', href: '/buy-numbers', auth: true },
  { label: 'FAQ', emoji: '❓', href: '/faq', auth: false },
  { label: 'Need help?', emoji: '👨‍💻', href: '/support', auth: false },
] as const;

const GUEST_MENU_ITEMS = [
  { label: 'Log in/Sign up', emoji: '🔐', href: '/login' },
  { label: 'FAQ', emoji: '❓', href: '/faq' },
  { label: 'Need help?', emoji: '👨‍💻', href: '/support' },
] as const;

type AuthMenuItem = (typeof MENU_ITEMS)[number];
type GuestMenuItem = (typeof GUEST_MENU_ITEMS)[number];
type VisibleMenuItem = AuthMenuItem | GuestMenuItem;

function TelegramPromoCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#fde0cc] bg-[#fff3eb] p-4">
      <p className="text-sm font-bold leading-tight text-[#f26522]">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#b45309]">{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-0.5 rounded-md bg-[#f26522] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d94e0f]"
      >
        Go to
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        Telegram
      </a>
    </div>
  );
}

export function SideMenu({ open, onClose }: SideMenuProps) {
  const { user } = useAuth();
  const { content } = useSiteContent();
  const navigate = useNavigate();
  const visibleItems = user ? MENU_ITEMS : GUEST_MENU_ITEMS;
  const telegramHref = getTelegramSupportUrl(content);

  useScrollLock(open);

  const getHref = (item: AuthMenuItem) => {
    if (item.auth && !user) return '/login';
    return item.href;
  };

  const handleItemClick = (item: VisibleMenuItem) => {
    onClose();
    navigate('auth' in item ? getHref(item) : item.href);
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ease-in-out',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen-safe w-[240px] flex-col border-r border-gray-200 bg-white shadow-xl dark:border-dm-border dark:bg-dm-bg',
          'transition-transform duration-300 ease-in-out will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-0.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-px w-full bg-gray-900/20 dark:bg-white/15" />

        <div className="flex-1 overflow-y-auto">
          <nav className="py-2">
            {visibleItems.map((item: VisibleMenuItem) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-900 hover:text-white dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                <span>{item.label}</span>
                <span aria-hidden="true">{item.emoji}</span>
              </button>
            ))}
          </nav>

          <div className="px-4 pb-4">
            <TelegramPromoCard
              href={telegramHref}
              title={content.footer.telegramPromoTitle}
              description={content.footer.telegramPromoDescription}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
