import { memo } from 'react';
import {
  BuyNumbersFlowScreen,
  BuyNumbersProviderScreen,
  MarketplaceScreen,
  RdpScreen,
  WalkthroughHeader,
} from '@/components/onboarding/walkthrough/SiteWalkthroughScreens';
import type { QuickTourStep } from '@/lib/quick-tour';

interface SiteWalkthroughPreviewProps {
  step: Extract<QuickTourStep, { placement: 'demo' }>;
}

export const SiteWalkthroughPreview = memo(function SiteWalkthroughPreview({ step }: SiteWalkthroughPreviewProps) {
  return (
    <div className="mx-auto mt-4 max-w-[220px]">
      <div className="overflow-hidden rounded-[20px] border-[4px] border-gray-900 bg-gray-100 shadow-lg dark:border-gray-700 dark:bg-dm-bg">
        <div className="relative aspect-9/16 bg-white dark:bg-dm-bg">
          <WalkthroughHeader />
          {step.demoScreen === 'marketplace' && <MarketplaceScreen highlightProduct />}
          {step.demoScreen === 'rdp' && <RdpScreen highlightPurchase />}
          {step.demoScreen === 'buy-numbers-provider' && <BuyNumbersProviderScreen highlightService={0} />}
          {step.demoScreen === 'buy-numbers-flow' && (
            <BuyNumbersFlowScreen highlightCountry highlightWhatsApp highlightReserve showCode />
          )}
        </div>
      </div>
    </div>
  );
});
