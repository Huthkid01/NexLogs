import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, Send, PlayCircle, Link2, CheckCircle, Lock, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { APP_NAME } from '@/constants';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { SideMenu } from '@/components/layout/SideMenu';
import { UserMenuDropdown } from '@/components/layout/UserMenuDropdown';
import { CurrencySelector } from '@/components/common/CurrencySelector';
import { FloatingActions } from '@/components/layout/FloatingActions';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useMarketplaceRealtime } from '@/hooks/useMarketplaceRealtime';
import { resolveSocialLinkHref } from '@/lib/telegram-url';

export function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { content } = useSiteContent();
  const location = useLocation();
  useMarketplaceRealtime({ userId: user?.id ?? null });
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthPage = authPages.includes(location.pathname);
  const hideAuthLink = isAuthPage;
  const hideFloatingActions = isAuthPage;
  const socialIcons = [Send, PlayCircle, Link2];
  const trustIcons = [CheckCircle, Lock, Clock];

  return (
    <div className="min-h-screen bg-white dark:bg-dm-bg">
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 shrink-0 border-b border-gray-100 bg-white dark:border-dm-border dark:bg-dm-bg">
          <div className="flex items-center justify-between h-[52px] px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 sm:gap-3">
              {!menuOpen && (
                <>
                  <button
                    type="button"
                    className="shrink-0 p-0.5 text-gray-900 dark:text-gray-100 hover:text-[#f26522]"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <Link to="/" className="flex items-center">
                    <NexLogsLogo className="h-7 sm:h-8" />
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {user ? <CurrencySelector compact /> : null}
              {user ? (
                <UserMenuDropdown />
              ) : !hideAuthLink ? (
                <Link
                  to="/login"
                  className="text-sm text-gray-800 dark:text-gray-200 hover:text-[#f26522] font-medium whitespace-nowrap"
                >
                  Log in/Sign up
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <main className={`w-full flex-1 ${isAuthPage ? 'lg:flex lg:flex-col' : ''}`}>
          <Outlet />
        </main>

        <footer className={`mt-auto w-full border-t border-gray-200 bg-[#f8f9fa] dark:border-dm-border dark:bg-dm-bg ${isAuthPage ? 'lg:hidden' : ''}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <Link to="/" className="inline-block mb-3">
                  <NexLogsLogo className="h-8 sm:h-9" />
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {content.footer.brandDescription}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3 tracking-wide">{content.footer.legalTitle}</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><Link to="/terms" className="hover:text-[#f26522]">Terms &amp; Conditions</Link></li>
                  <li><Link to="/privacy" className="hover:text-[#f26522]">Refund Policy</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3 tracking-wide">{content.footer.connectTitle}</h4>
                <div className="flex gap-2">
                  {content.footer.socialLinks.map((link, index) => {
                    const Icon = socialIcons[index] ?? Link2;
                    const href = resolveSocialLinkHref(link.label, link.href);
                    return (
                    <a
                      key={`${link.label}-${index}`}
                      href={href}
                      target={link.label.toLowerCase() === 'telegram' ? '_blank' : undefined}
                      rel={link.label.toLowerCase() === 'telegram' ? 'noopener noreferrer' : undefined}
                      className="w-9 h-9 rounded-full bg-gray-200 dark:bg-dm-surface flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-[#f26522] hover:text-white transition-colors"
                      aria-label={link.label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3 tracking-wide">{content.footer.trustTitle}</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {content.footer.trustItems.map((item, index) => {
                    const Icon = trustIcons[index] ?? CheckCircle;
                    return (
                      <li key={`${item}-${index}`} className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[#1b5e20] shrink-0" /> {item}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-dm-border mt-8 pt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
      {!hideFloatingActions ? <FloatingActions /> : null}
    </div>
  );
}
