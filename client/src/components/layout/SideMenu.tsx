import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { label: 'Marketplace', emoji: '🏠', href: '/marketplace', auth: true },
  { label: 'Purchase RDP', emoji: '🖥️', href: '/purchase-rdp', auth: true },
  { label: 'My Purchases', emoji: '🛒', href: '/purchases', auth: true },
  { label: 'Buy Numbers', emoji: '📱', href: '/marketplace?type=numbers', auth: true },
  { label: 'Need help?', emoji: '🕵️', href: '/support', auth: false },
] as const;

const GUEST_MENU_ITEMS = [
  { label: 'Log in/Sign up', emoji: '🔐', href: '/login' },
  { label: 'Need help?', emoji: '🕵️', href: '/support' },
] as const;

type AuthMenuItem = (typeof MENU_ITEMS)[number];
type GuestMenuItem = (typeof GUEST_MENU_ITEMS)[number];
type VisibleMenuItem = AuthMenuItem | GuestMenuItem;

export function SideMenu({ open, onClose }: SideMenuProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const visibleItems = user ? MENU_ITEMS : GUEST_MENU_ITEMS;

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
          'fixed inset-0 bg-black/25 z-40 transition-opacity duration-300 ease-in-out',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 w-[240px] h-screen bg-white dark:bg-dm-bg border-r border-gray-200 dark:border-dm-border flex flex-col shadow-xl',
          'transition-transform duration-300 ease-in-out will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-0.5"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-px w-full bg-gray-900/20 dark:bg-white/15" />

        <nav className="py-2">
          {visibleItems.map((item: VisibleMenuItem) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleItemClick(item)}
              className="w-full flex items-center gap-2 py-2.5 px-4 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-900 hover:text-white dark:hover:bg-gray-700 dark:hover:text-gray-100 text-left transition-colors"
            >
              <span>{item.label}</span>
              <span aria-hidden="true">{item.emoji}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="p-4">
          <div className="rounded-xl bg-[#fff3eb] border border-[#fde0cc] p-4 space-y-2">
            <p className="text-[#f26522] font-bold text-sm leading-tight">
              Telegram channel/support
            </p>
            <p className="text-xs text-[#f26522]/80 leading-relaxed">
              daily update on high followers and monetized accounts
            </p>
            <a
              href="https://t.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-1 w-full btn-orange py-2 text-xs sm:text-sm"
            >
              Go to<ChevronRight className="h-3.5 w-3.5" /> Telegram
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
