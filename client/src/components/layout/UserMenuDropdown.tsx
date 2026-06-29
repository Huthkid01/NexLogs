import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { cn } from '@/lib/utils';

export function UserMenuDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const { data: stats } = useWalletBalance(user?.id);
  const { formatDisplayAmount } = useFormatDisplayPrice();
  const balance = stats?.balance ?? 0;
  const profileHref = profile?.role === 'admin' ? '/admin' : '/profile';

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 bg-[#f26522] text-white rounded-lg pl-1.5 pr-3 py-1.5 text-sm hover:bg-[#d94e0f] transition-colors max-w-[min(100%,320px)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0 overflow-hidden">
          <User className="h-4 w-4 text-white" />
        </span>
        <span className="truncate hidden sm:inline">{user.email}</span>
        <span className="font-semibold shrink-0">({formatDisplayAmount(balance)})</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 opacity-80 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-dm-surface rounded-lg border border-gray-200 dark:border-dm-border shadow-lg overflow-hidden z-50"
        >
          <div className="py-1">
            <Link
              to={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-dm-input"
            >
              Profile
            </Link>
            <Link
              to="/add-funds"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-dm-input"
            >
              Add funds
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-dm-input"
            >
              Logout
            </button>
          </div>

          <div className="h-px bg-gray-200 dark:bg-dm-border" />

          <button
            type="button"
            role="menuitem"
            onClick={toggleTheme}
            className="w-full bg-gray-50 dark:bg-dm-input px-4 py-2.5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dm-surface transition-colors"
          >
            {theme === 'light' ? (
              <>
                <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                Dark Mode
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
