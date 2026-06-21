import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ShoppingBag, Tag, BarChart3, LogOut, Menu, Moon, Sun, Settings, X, ChevronLeft, ChevronRight, LifeBuoy, Activity, ChevronDown, ChevronUp, House, PanelsTopLeft, Info, CircleHelp, Mail, FileText, RotateCcw, Images, ArrowUpDown, Monitor,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/constants';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/tickets', label: 'Tickets', icon: LifeBuoy },
  { href: '/admin/activity', label: 'Activity Logs', icon: Activity },
  { href: '/admin/slides', label: 'Slide Management', icon: Images },
  { href: '/admin/exchange-rates', label: 'Exchange Rates', icon: ArrowUpDown },
  { href: '/admin/rdp', label: 'RDP Plans', icon: Monitor },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const siteContentItems = [
  { href: '/admin/exchange-rates', label: 'Exchange Rates', icon: ArrowUpDown },
  { href: '/admin/content/homepage', label: 'Homepage', icon: House },
  { href: '/admin/content/footer', label: 'Footer', icon: PanelsTopLeft },
  { href: '/admin/content/about', label: 'About Page', icon: Info },
  { href: '/admin/content/faq', label: 'FAQ', icon: CircleHelp },
  { href: '/admin/content/contact', label: 'Contact Page', icon: Mail },
  { href: '/admin/content/support', label: 'Support Page', icon: LifeBuoy },
  { href: '/admin/content/terms', label: 'Terms & Conditions', icon: FileText },
  { href: '/admin/content/refund', label: 'Refund Policy', icon: RotateCcw },
];

export function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<{ label: string; top: number; showStateIcon?: boolean } | null>(null);
  const [contentFlyoutTop, setContentFlyoutTop] = useState<number | null>(null);
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isDark = theme === 'dark';
  const contentMenuActive = location.pathname.startsWith('/admin/content');
  const [contentMenuOpen, setContentMenuOpen] = useState(contentMenuActive);

  const showCollapsedTooltip = (
    event: React.MouseEvent<HTMLElement>,
    label: string,
    options?: { showStateIcon?: boolean }
  ) => {
    if (!desktopSidebarCollapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverTooltip({
      label,
      top: rect.top + rect.height / 2,
      showStateIcon: options?.showStateIcon,
    });
  };

  const hideCollapsedTooltip = () => {
    setHoverTooltip(null);
  };

  const updateContentFlyoutPosition = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const estimatedFlyoutHeight = 360;
    const viewportPadding = 16;
    const nextTop = Math.max(
      viewportPadding,
      Math.min(rect.top, window.innerHeight - estimatedFlyoutHeight - viewportPadding)
    );
    setContentFlyoutTop(nextTop);
  };

  return (
    <div className={cn('min-h-screen transition-colors', isDark ? 'bg-[#040b16] text-slate-100' : 'bg-[#f5f7fb] text-slate-900')}>
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 overflow-visible border-r transition-[width,transform,background-color,border-color,color] duration-300 lg:translate-x-0',
        isDark ? 'border-[#18263b] bg-[#050d19] text-slate-100' : 'border-slate-200 bg-white text-slate-900 shadow-sm',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        desktopSidebarCollapsed ? 'w-64 lg:w-20' : 'w-64'
      )}>
        <div className="flex h-full min-h-0 flex-col">
          <div className={cn(isDark ? 'border-b border-[#18263b]' : 'border-b border-slate-200', desktopSidebarCollapsed ? 'px-3 py-5 lg:px-3' : 'p-6')}>
            <div className={cn('flex items-start justify-between gap-3', desktopSidebarCollapsed && 'lg:flex-col lg:items-center lg:justify-start')}>
              <div className={cn('min-w-0', desktopSidebarCollapsed && 'lg:flex lg:w-full lg:flex-col lg:items-center lg:justify-center lg:gap-3')}>
                <div className={cn(desktopSidebarCollapsed && 'lg:hidden')}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', isDark ? 'text-amber-500/90' : 'text-[#f26522]')}>Admin Panel</p>
                  <Link to="/admin" className={cn('admin-heading mt-2 block truncate text-2xl font-semibold', isDark ? 'text-slate-50' : 'text-slate-900')}>
                    {APP_NAME}
                  </Link>
                </div>
                <Link
                  to="/admin"
                  className={cn(
                    'hidden h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold',
                    isDark ? 'border-[#22324a] bg-[#081624] text-slate-100' : 'border-slate-200 bg-slate-100 text-slate-800',
                    desktopSidebarCollapsed && 'lg:inline-flex'
                  )}
                  title={APP_NAME}
                >
                  {APP_NAME.charAt(0).toUpperCase()}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setDesktopSidebarCollapsed((current) => !current)}
                className={cn(
                  'hidden h-9 w-9 items-center justify-center rounded-lg border transition-colors lg:inline-flex',
                  desktopSidebarCollapsed && 'lg:order-first',
                  isDark
                    ? 'border-[#22324a] bg-[#0a1628] text-slate-200 hover:bg-[#10213a]'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
                aria-label={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {desktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md lg:hidden',
                  isDark ? 'text-slate-400 hover:bg-[#0d1b2d] hover:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className={cn('mt-4 text-xs', isDark ? 'text-slate-500' : 'text-slate-500', desktopSidebarCollapsed && 'lg:hidden')}>
              Dashboard management and website controls
            </p>
          </div>
          <nav className="flex-1 min-h-0 space-y-1 overflow-x-visible overflow-y-auto p-4">
            <p className={cn('px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em]', isDark ? 'text-slate-500' : 'text-slate-500', desktopSidebarCollapsed && 'lg:hidden')}>
              Overview
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === '/admin'
                ? location.pathname === item.href
                : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    hideCollapsedTooltip();
                    setContentMenuOpen(false);
                    setContentFlyoutTop(null);
                  }}
                  onMouseEnter={(event) => showCollapsedTooltip(event, item.label)}
                  onMouseLeave={hideCollapsedTooltip}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    desktopSidebarCollapsed && 'lg:justify-center lg:px-0',
                    active
                      ? isDark
                        ? 'bg-[#0f2340] text-slate-50 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]'
                        : 'bg-[#eef4ff] text-[#1d4ed8] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]'
                      : isDark
                        ? 'text-slate-400 hover:bg-[#0b1728] hover:text-slate-100'
                      : 'text-slate-600 hover:bg-[#e8f1ff] hover:text-[#1d4ed8]'
                  )}
                  title={desktopSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span className={cn('truncate', desktopSidebarCollapsed && 'lg:hidden')}>{item.label}</span>
                </Link>
              );
            })}
            <div className="relative space-y-1">
              <button
                type="button"
                onClick={(event) => {
                  if (desktopSidebarCollapsed) {
                    updateContentFlyoutPosition(event);
                  } else {
                    setContentFlyoutTop(null);
                  }
                  setContentMenuOpen((current) => !current);
                  hideCollapsedTooltip();
                }}
                onMouseEnter={(event) => showCollapsedTooltip(event, 'Site Content', { showStateIcon: true })}
                onMouseLeave={hideCollapsedTooltip}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  desktopSidebarCollapsed && 'lg:justify-center lg:px-0',
                  contentMenuActive
                    ? isDark
                      ? 'bg-[#0f2340] text-slate-50 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]'
                      : 'bg-[#eef4ff] text-[#1d4ed8] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]'
                    : isDark
                      ? 'text-slate-400 hover:bg-[#0b1728] hover:text-slate-100'
                      : 'text-slate-600 hover:bg-[#e8f1ff] hover:text-[#1d4ed8]'
                )}
                title={desktopSidebarCollapsed ? 'Site Content' : undefined}
              >
                <Settings className="h-4 w-4" />
                <span className={cn('truncate', desktopSidebarCollapsed && 'lg:hidden')}>Site Content</span>
                {contentMenuOpen ? (
                  <ChevronUp className={cn('ml-auto h-4 w-4', desktopSidebarCollapsed && 'lg:hidden')} />
                ) : (
                  <ChevronDown className={cn('ml-auto h-4 w-4', desktopSidebarCollapsed && 'lg:hidden')} />
                )}
              </button>
              {contentMenuOpen && !desktopSidebarCollapsed && (
                <div
                  className={cn(
                    'ml-3 max-h-[320px] space-y-1 overflow-y-auto rounded-2xl border px-2 py-2',
                    isDark ? 'border-[#18263b] bg-[#081321]' : 'border-[#d7e7ff] bg-[#f2f7ff]'
                  )}
                >
                  {siteContentItems.map((item) => {
                    const active = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => {
                          setMobileSidebarOpen(false);
                          setContentFlyoutTop(null);
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                          active
                            ? isDark
                              ? 'bg-[#10213a] text-slate-100'
                              : 'bg-[#dcecff] text-[#1d4ed8]'
                            : isDark
                              ? 'text-slate-400 hover:bg-[#0b1728] hover:text-slate-100'
                              : 'text-slate-700 hover:bg-[#dcecff] hover:text-[#1d4ed8]'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
          <div className={cn('p-4', isDark ? 'border-t border-[#18263b]' : 'border-t border-slate-200')}>
            <p className={cn('mb-2 px-3 text-xs', isDark ? 'text-slate-400' : 'text-slate-500', desktopSidebarCollapsed && 'lg:hidden')}>
              {profile?.full_name} (Admin)
            </p>
            <div className={cn('group relative', desktopSidebarCollapsed && 'lg:flex lg:justify-center')}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full',
                  isDark ? 'text-slate-100 hover:bg-[#0d1b2d]' : 'text-slate-700 hover:bg-[#e8f1ff] hover:text-[#1d4ed8]',
                  desktopSidebarCollapsed ? 'justify-center lg:px-0' : 'justify-start'
                )}
                onClick={signOut}
                onMouseEnter={(event) => showCollapsedTooltip(event, 'Sign Out')}
                onMouseLeave={hideCollapsedTooltip}
                title={desktopSidebarCollapsed ? 'Sign Out' : undefined}
              >
                <LogOut className={cn('h-4 w-4', !desktopSidebarCollapsed && 'mr-2')} />
                <span className={cn(desktopSidebarCollapsed && 'lg:hidden')}>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {hoverTooltip && desktopSidebarCollapsed && (
        <div
          className={cn(
            'pointer-events-none fixed left-[92px] z-[80] hidden -translate-y-1/2 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs shadow-lg lg:flex',
            isDark ? 'border-[#22324a] bg-[#081624] text-slate-100' : 'border-slate-200 bg-white text-slate-900'
          )}
          style={{ top: hoverTooltip.top }}
        >
          <span className="whitespace-nowrap">{hoverTooltip.label}</span>
          {hoverTooltip.showStateIcon ? (
            contentMenuOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          ) : null}
        </div>
      )}

      {contentMenuOpen && desktopSidebarCollapsed && contentFlyoutTop !== null && (
        <div
          className={cn(
            'fixed left-[92px] z-[85] hidden max-h-[calc(100vh-32px)] min-w-[240px] overflow-y-auto rounded-xl border p-2 shadow-xl lg:block',
            isDark ? 'border-[#22324a] bg-[#081624] text-slate-100' : 'border-slate-200 bg-white text-slate-900'
          )}
          style={{ top: contentFlyoutTop }}
        >
          <p className={cn('px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em]', isDark ? 'text-slate-500' : 'text-slate-500')}>
            Site Content
          </p>
          <div className="space-y-1">
            {siteContentItems.map((item) => {
              const active = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    setContentMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? isDark
                        ? 'bg-[#10213a] text-slate-100'
                        : 'bg-[#eef4ff] text-[#1d4ed8]'
                      : isDark
                        ? 'text-slate-400 hover:bg-[#0b1728] hover:text-slate-100'
                        : 'text-slate-600 hover:bg-[#e8f1ff] hover:text-[#1d4ed8]'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-col transition-[padding] duration-300',
          desktopSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <header className={cn(
          'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b px-4 backdrop-blur lg:px-8',
          isDark ? 'border-[#18263b] bg-[#07111f]/95' : 'border-slate-200 bg-white/95'
        )}>
          <button
            type="button"
            className={cn(
              'rounded-md border p-2 lg:hidden',
              isDark ? 'border-[#22324a] bg-[#0a1628] text-slate-200 hover:bg-[#10213a]' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Show sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className={cn('admin-heading text-xl font-semibold', isDark ? 'text-slate-50' : 'text-slate-900')}>Admin Dashboard</h1>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className={cn(
              isDark ? 'border-[#22324a] bg-[#0a1628] text-slate-100 hover:bg-[#10213a]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            )}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark Mode
              </>
            )}
          </Button>
        </header>
        <main className="flex-1 bg-transparent p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
