import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useWalkthroughPlayback } from '@/hooks/useWalkthroughPlayback';
import {
  BuyNumbersFlowScreen,
  BuyNumbersProviderScreen,
  MarketplaceScreen,
  MenuOverlay,
  RdpScreen,
  WalkthroughCaption,
  WalkthroughHeader,
  WalletDropdown,
  type WalkthroughScreen,
} from '@/components/onboarding/walkthrough/SiteWalkthroughScreens';

interface WalkthroughPhase {
  duration: number;
  screen: WalkthroughScreen;
  caption: string;
  menuOpen?: boolean;
  walletOpen?: boolean;
  highlightMenu?: boolean;
  highlightWallet?: boolean;
  activeMenuIndex?: number | null;
  activeWalletIndex?: number | null;
  highlightProduct?: boolean;
  highlightPurchase?: boolean;
  highlightProviderService?: number;
  highlightWhatsApp?: boolean;
  highlightCountry?: boolean;
  highlightReserve?: boolean;
  showCode?: boolean;
}

const PHASES: WalkthroughPhase[] = [
  {
    duration: 3000,
    screen: 'menu',
    highlightMenu: true,
    caption: 'Tap the menu icon (☰) on the top left to open navigation.',
  },
  {
    duration: 4000,
    screen: 'menu',
    menuOpen: true,
    activeMenuIndex: 0,
    caption: 'Open Marketplace, Purchase RDP, Buy Numbers for SMS Verification, FAQ, and Support from here.',
  },
  {
    duration: 3500,
    screen: 'wallet',
    highlightWallet: true,
    caption: 'Your wallet balance is in the orange button on the top right.',
  },
  {
    duration: 4000,
    screen: 'wallet',
    walletOpen: true,
    activeWalletIndex: 1,
    caption: 'Add funds first — every purchase on Nexlogs is paid from your wallet.',
  },
  {
    duration: 4500,
    screen: 'marketplace',
    caption: 'The Marketplace shows hero slides, quick actions, and product listings.',
  },
  {
    duration: 4500,
    screen: 'marketplace',
    highlightProduct: true,
    caption: 'Pick a product, tap View Products, choose a variant, and pay from your wallet.',
  },
  {
    duration: 4500,
    screen: 'rdp',
    caption: 'Purchase RDP: choose a server location, then pick a plan that fits your needs.',
  },
  {
    duration: 4500,
    screen: 'rdp',
    highlightPurchase: true,
    caption: 'Select a plan and tap Purchase — credentials arrive in My Purchases within minutes.',
  },
  {
    duration: 4000,
    screen: 'buy-numbers-provider',
    highlightProviderService: 0,
    caption: 'Buy Numbers for SMS Verification offers Service 1 and Service 2.',
  },
  {
    duration: 4500,
    screen: 'buy-numbers-flow',
    highlightCountry: true,
    highlightWhatsApp: true,
    caption: 'Choose country and app (e.g. WhatsApp), then select a price pool.',
  },
  {
    duration: 4500,
    screen: 'buy-numbers-flow',
    highlightReserve: true,
    showCode: true,
    caption: 'Reserve a number, wait on the page, then copy the verification code when it arrives.',
  },
  {
    duration: 3500,
    screen: 'marketplace',
    caption: 'You are set — menu on the left, wallet on the right, marketplace and tools in between.',
  },
];

function renderScreen(phase: WalkthroughPhase) {
  switch (phase.screen) {
    case 'menu':
    case 'wallet':
      return null;
    case 'marketplace':
      return <MarketplaceScreen highlightProduct={phase.highlightProduct} />;
    case 'rdp':
      return <RdpScreen highlightPurchase={phase.highlightPurchase} />;
    case 'buy-numbers-provider':
      return <BuyNumbersProviderScreen highlightService={phase.highlightProviderService} />;
    case 'buy-numbers-flow':
      return (
        <BuyNumbersFlowScreen
          highlightCountry={phase.highlightCountry}
          highlightWhatsApp={phase.highlightWhatsApp}
          highlightReserve={phase.highlightReserve}
          showCode={phase.showCode}
        />
      );
    default:
      return null;
  }
}

interface MenuWalletWalkthroughProps {
  active?: boolean;
}

function MenuWalletWalkthroughComponent({ active = true }: MenuWalletWalkthroughProps) {
  const { phase, phaseIndex, secondsLeft, cycleKey, totalMs, isPlaying } = useWalkthroughPlayback(
    PHASES,
    active,
  );
  const showChrome = phase.screen === 'menu' || phase.screen === 'wallet';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-surface sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#f26522]">Quick start</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
            How to use Nexlogs
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Full walkthrough — menu, wallet, marketplace, RDP, and SMS verification numbers.
          </p>
        </div>
        <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          ~{Math.round(totalMs / 1000)}s
        </div>
      </div>

      <div className="relative mx-auto max-w-[320px]">
        <div className="overflow-hidden rounded-[28px] border-[6px] border-gray-900 bg-gray-100 shadow-xl dark:border-gray-700 dark:bg-dm-bg">
          <div className="relative aspect-9/16 bg-white dark:bg-dm-bg">
            <WalkthroughHeader
              highlightMenu={phase.highlightMenu}
              highlightWallet={phase.highlightWallet}
              menuOpen={phase.menuOpen}
              walletOpen={phase.walletOpen}
            />

            {showChrome && (
              <>
                <MenuOverlay menuOpen={phase.menuOpen} activeMenuIndex={phase.activeMenuIndex} />
                <WalletDropdown walletOpen={phase.walletOpen} activeWalletIndex={phase.activeWalletIndex} />
              </>
            )}

            {renderScreen(phase)}

            <WalkthroughCaption>{phase.caption}</WalkthroughCaption>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-dm-border">
            <div
              key={cycleKey}
              className={cn(
                'walkthrough-progress-bar h-full rounded-full bg-[#f26522]',
                isPlaying && 'walkthrough-progress-bar--active',
              )}
              style={{ '--walkthrough-duration': `${totalMs}ms` } as React.CSSProperties}
            />
          </div>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {secondsLeft}s
          </span>
        </div>

        <div className="mt-3 flex justify-center gap-1.5">
          {PHASES.map((_, dotIndex) => (
            <span
              key={dotIndex}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                dotIndex === phaseIndex ? 'w-5 bg-[#f26522]' : 'w-1.5 bg-gray-300 dark:bg-dm-border',
              )}
            />
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        Replay anytime from Profile → Take website quick tour.
      </p>
    </div>
  );
}

export const MenuWalletWalkthrough = memo(MenuWalletWalkthroughComponent);
