import { memo } from 'react';
import { Check, ChevronDown, Globe, Menu, Search, Smartphone, User, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WalkthroughScreen =
  | 'menu'
  | 'wallet'
  | 'marketplace'
  | 'rdp'
  | 'buy-numbers-provider'
  | 'buy-numbers-flow';

interface ScreenProps {
  highlightMenu?: boolean;
  highlightWallet?: boolean;
  menuOpen?: boolean;
  walletOpen?: boolean;
  activeMenuIndex?: number | null;
  activeWalletIndex?: number | null;
}

const MENU_ITEMS = [
  { label: 'Marketplace', emoji: '🏠' },
  { label: 'Purchase RDP', emoji: '🖥️' },
  { label: 'My Purchases', emoji: '🛒' },
  { label: 'Buy Numbers', emoji: '📱' },
  { label: 'FAQ', emoji: '❓' },
  { label: 'Need help?', emoji: '👨‍💻' },
] as const;

const WALLET_ITEMS = ['Profile', 'Add funds', 'Logout'] as const;

const MARKETPLACE_PRODUCTS = [
  { title: 'Instagram Aged Account', price: '₦4,500', platform: 'IG' },
  { title: 'TikTok Verified Page', price: '₦8,200', platform: 'TT' },
] as const;

const RDP_LOCATIONS = ['USA', 'UK', 'Germany', 'Canada'] as const;

export const WalkthroughHeader = memo(function WalkthroughHeader({
  highlightMenu,
  highlightWallet,
  menuOpen,
  walletOpen,
}: Pick<ScreenProps, 'highlightMenu' | 'highlightWallet' | 'menuOpen' | 'walletOpen'>) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between border-b border-gray-100 bg-white px-3 dark:border-dm-border dark:bg-dm-bg">
      <div className="flex items-center gap-2">
        {!menuOpen && (
          <>
            <span
              className={cn(
                'rounded-md p-0.5 transition-all duration-300',
                highlightMenu && 'ring-2 ring-[#f26522] ring-offset-2 ring-offset-white dark:ring-offset-dm-bg',
              )}
            >
              <Menu className="h-5 w-5 text-gray-900 dark:text-gray-100" strokeWidth={2} />
            </span>
            <span className="text-[10px] font-bold tracking-tight text-[#f26522]">NexLogs</span>
          </>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-1 rounded-lg bg-[#f26522] px-2 py-1 text-[10px] font-semibold text-white transition-all duration-300',
          highlightWallet && 'ring-2 ring-[#f26522] ring-offset-2 ring-offset-white dark:ring-offset-dm-bg',
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3b82f6]">
          <User className="h-3 w-3 text-white" />
        </span>
        <span className="max-w-[72px] truncate">you@nexlogs</span>
        <span>($12.50)</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-300', walletOpen && 'rotate-180')} />
      </div>
    </div>
  );
});

export const MenuOverlay = memo(function MenuOverlay({
  menuOpen,
  activeMenuIndex,
}: Pick<ScreenProps, 'menuOpen' | 'activeMenuIndex'>) {
  return (
    <>
      <div
        className={cn(
          'absolute inset-0 z-10 bg-black/25 transition-opacity duration-300',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'absolute top-0 left-0 z-20 flex h-full w-[58%] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-500 ease-out dark:border-dm-border dark:bg-dm-bg',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-3 py-3 text-xs font-bold text-gray-900 dark:text-gray-100">Menu</div>
        <div className="h-px bg-gray-200 dark:bg-dm-border" />
        <nav className="py-1">
          {MENU_ITEMS.map((item, itemIndex) => (
            <div
              key={item.label}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-[11px] text-gray-800 transition-colors dark:text-gray-200',
                activeMenuIndex === itemIndex && 'bg-gray-900 text-white dark:bg-gray-700',
              )}
            >
              <span>{item.label}</span>
              <span>{item.emoji}</span>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
});

export const WalletDropdown = memo(function WalletDropdown({
  walletOpen,
  activeWalletIndex,
}: Pick<ScreenProps, 'walletOpen' | 'activeWalletIndex'>) {
  return (
    <div
      className={cn(
        'absolute top-12 right-2 z-30 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-300 dark:border-dm-border dark:bg-dm-surface',
        walletOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      {WALLET_ITEMS.map((item, itemIndex) => (
        <div
          key={item}
          className={cn(
            'px-3 py-2 text-[11px]',
            item === 'Logout' ? 'text-red-600' : 'text-gray-900 dark:text-gray-100',
            activeWalletIndex === itemIndex && 'bg-secondary dark:bg-[#2d1a0f]',
          )}
        >
          {item}
        </div>
      ))}
    </div>
  );
});

export const MarketplaceScreen = memo(function MarketplaceScreen({ highlightProduct }: { highlightProduct?: boolean }) {
  return (
    <div className="absolute inset-x-0 top-11 bottom-0 overflow-hidden bg-white dark:bg-dm-bg">
      <div className="relative h-24 overflow-hidden bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#f26522]/80">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-center px-3">
          <p className="text-[10px] font-bold text-white">Verified social accounts</p>
          <p className="mt-1 max-w-[200px] text-[9px] leading-snug text-white/85">
            Browse Instagram, TikTok, YouTube and more from your wallet.
          </p>
          <span className="mt-2 inline-flex w-fit rounded-md bg-[#f26522] px-2 py-0.5 text-[8px] font-semibold text-white">
            Shop now
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-2 px-3 py-2">
        <span className="btn-orange min-w-[88px] px-2 py-1.5 text-center text-[9px]">Purchase RDP</span>
        <span className="btn-green min-w-[88px] px-2 py-1.5 text-center text-[9px]">Buy Numbers</span>
      </div>

      <div className="px-3">
        <p className="text-[8px] text-gray-500 dark:text-gray-400">Shop by Categories</p>
        <div className="mt-1 flex h-7 items-center justify-between rounded-md border border-gray-300 bg-white px-2 text-[9px] text-gray-600 dark:border-dm-border dark:bg-dm-surface dark:text-gray-300">
          <span>All categories</span>
          <ChevronDown className="h-3 w-3" />
        </div>
      </div>

      <div className="mt-2 px-3">
        <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100">Buy Logs</p>
        <p className="mt-2 text-[9px] font-bold text-gray-900 dark:text-gray-100">Latest Products</p>
      </div>

      <div className="mt-1 space-y-0">
        {MARKETPLACE_PRODUCTS.map((product, index) => (
          <div
            key={product.title}
            className={cn(
              'border-t border-gray-100 px-3 py-2 transition-all dark:border-dm-border dark:bg-dm-product-row',
              highlightProduct && index === 0 && 'ring-2 ring-inset ring-[#f26522]',
            )}
          >
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[8px] font-bold text-gray-600 dark:bg-dm-surface">
                {product.platform}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-gray-900 dark:text-gray-100">{product.title}</p>
                <p className="mt-0.5 text-[8px] font-medium text-[#1b5e20]">Starting from {product.price}</p>
              </div>
              <span className="text-[8px] font-medium text-[#f26522]">View Products</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const RdpScreen = memo(function RdpScreen({ highlightPurchase }: { highlightPurchase?: boolean }) {
  return (
    <div className="absolute inset-x-0 top-11 bottom-0 overflow-y-auto bg-gray-50 px-3 py-3 dark:bg-dm-bg">
      <h2 className="text-[11px] font-bold text-gray-900 dark:text-gray-100">Purchase RDP</h2>
      <p className="mt-1 text-[8px] text-gray-500 dark:text-gray-400">Remote desktop plans billed from your wallet.</p>

      <p className="mt-3 text-[8px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        Select a Location
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {RDP_LOCATIONS.map((location, index) => (
          <div
            key={location}
            className={cn(
              'rounded-lg border px-2 py-1.5 text-center text-[8px] font-medium',
              index === 0
                ? 'border-[#f26522] bg-[#fff4ef] text-[#c2410c] dark:bg-[#f26522]/10 dark:text-orange-200'
                : 'border-gray-200 bg-white text-gray-700 dark:border-dm-border dark:bg-dm-surface dark:text-gray-200',
            )}
          >
            {location}
          </div>
        ))}
      </div>

      <div
        className={cn(
          'mt-3 rounded-xl border bg-white p-3 shadow-sm transition-all dark:bg-dm-surface',
          highlightPurchase ? 'border-[#f26522] ring-1 ring-[#f26522]/30' : 'border-gray-200 dark:border-dm-border',
        )}
      >
        <div className="flex items-start justify-between">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff4ef] text-[#f26522] dark:bg-[#f26522]/15">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <span className="rounded-full border border-[#f26522] px-1.5 py-0.5 text-[7px] font-medium text-[#f26522]">
            Selected
          </span>
        </div>
        <p className="mt-2 text-[10px] font-semibold text-gray-900 dark:text-gray-100">Standard (8GB RAM)</p>
        <p className="mt-1 text-[11px] font-bold text-gray-900 dark:text-gray-100">₦12,000 / Month</p>
        <ul className="mt-2 space-y-1">
          {['Windows Server', 'Full admin access', 'Instant delivery'].map((feature) => (
            <li key={feature} className="flex items-start gap-1 text-[8px] text-gray-600 dark:text-gray-300">
              <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 w-full rounded-md bg-[#f26522] py-1.5 text-center text-[9px] font-semibold text-white">
          Purchase from wallet
        </div>
      </div>
    </div>
  );
});

export const BuyNumbersProviderScreen = memo(function BuyNumbersProviderScreen({ highlightService }: { highlightService?: number }) {
  return (
    <div className="absolute inset-x-0 top-11 bottom-0 overflow-y-auto bg-[#f3f4f6] px-3 py-4 dark:bg-dm-bg">
      <h2 className="text-[11px] font-bold text-gray-900 dark:text-gray-100">Buy Numbers</h2>
      <p className="mt-1 text-[8px] text-gray-500 dark:text-gray-400">Choose a service to continue</p>
      <div className="mt-3 space-y-2">
        {['Service 1', 'Service 2'].map((label, index) => (
          <div
            key={label}
            className={cn(
              'rounded-xl border px-3 py-3 text-[10px] font-semibold transition-all',
              highlightService === index
                ? 'border-[#f26522] bg-[#fff7f2] text-gray-800 ring-1 ring-[#f26522]/40 dark:bg-[#f26522]/10 dark:text-gray-100'
                : 'border-gray-200 bg-gray-50 text-gray-800 dark:border-dm-border dark:bg-dm-bg dark:text-gray-100',
            )}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
});

export const BuyNumbersFlowScreen = memo(function BuyNumbersFlowScreen({
  highlightCountry,
  highlightWhatsApp,
  highlightReserve,
  showCode,
}: {
  highlightCountry?: boolean;
  highlightWhatsApp?: boolean;
  highlightReserve?: boolean;
  showCode?: boolean;
}) {
  return (
    <div className="absolute inset-x-0 top-11 bottom-0 overflow-y-auto bg-[#f3f4f6] px-3 py-3 dark:bg-dm-bg">
      <h2 className="text-[10px] font-bold text-gray-900 dark:text-gray-100">SMS Verification (Service 1)</h2>

      <label className="mt-3 flex items-center gap-1 text-[9px] font-bold text-gray-900 dark:text-gray-100">
        <Globe className="h-3 w-3 text-[#f26522]" />
        Select Country
      </label>
      <div
        className={cn(
          'mt-1 flex h-8 items-center rounded-lg border bg-white px-2 text-[8px] text-gray-700 transition-all dark:border-dm-border dark:bg-dm-surface dark:text-gray-200',
          highlightCountry ? 'border-[#f26522] ring-1 ring-[#f26522]/30' : 'border-gray-300',
        )}
      >
        <Search className="mr-1 h-3 w-3 text-gray-400" />
        United States
      </div>

      <label className="mt-3 flex items-center gap-1 text-[9px] font-bold text-gray-900 dark:text-gray-100">
        <Smartphone className="h-3 w-3 text-[#f26522]" />
        Services
      </label>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {['WhatsApp', 'Telegram', 'Google'].map((service) => (
          <div
            key={service}
            className={cn(
              'rounded-lg border px-1 py-2 text-center text-[8px] font-bold',
              service === 'WhatsApp' && highlightWhatsApp
                ? 'border-[#f26522] bg-[#f26522] text-white'
                : 'border-gray-200 bg-white text-gray-900 dark:border-dm-border dark:bg-dm-surface dark:text-gray-100',
            )}
          >
            {service}
          </div>
        ))}
      </div>

      <div
        className={cn(
          'mt-3 rounded-lg border bg-white p-2 transition-all dark:bg-dm-surface',
          highlightReserve ? 'border-[#f26522] ring-1 ring-[#f26522]/30' : 'border-gray-200 dark:border-dm-border',
        )}
      >
        <p className="text-[8px] font-bold text-gray-900 dark:text-gray-100">Pool A · ₦1,850</p>
        <div className="mt-1.5 rounded-md bg-[#f26522] py-1 text-center text-[8px] font-semibold text-white">
          Reserve number
        </div>
      </div>

      {showCode && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="text-[8px] text-gray-600 dark:text-gray-300">
            <strong>Number:</strong> +1 555 012 3456
          </p>
          <p className="mt-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
            Code: 482910
          </p>
        </div>
      )}
    </div>
  );
});

export const WalkthroughCaption = memo(function WalkthroughCaption({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-4 pt-10 dark:from-dm-bg dark:via-dm-bg/95">
      <p className="text-center text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">{children}</p>
    </div>
  );
});
