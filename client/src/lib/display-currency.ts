import type { DisplayCurrency } from '@/contexts/display-currency';
import { formatPrice } from '@/lib/utils';
import type { WalletExchangeRates } from '@/lib/wallet-exchange-rates';

export function convertUsdToDisplay(
  usdAmount: number,
  currency: DisplayCurrency,
  rates: WalletExchangeRates,
): number {
  if (currency === 'USD') return usdAmount;
  const ngnRate = rates.NGN ?? 1500;
  return usdAmount * ngnRate;
}

export function formatDisplayPrice(
  usdAmount: number,
  currency: DisplayCurrency,
  rates: WalletExchangeRates,
): string {
  if (currency === 'USD') {
    return formatPrice(usdAmount, 'USD');
  }

  const ngnAmount = convertUsdToDisplay(usdAmount, 'NGN', rates);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(ngnAmount);
}

export function formatDisplayPriceWithPeriod(
  usdAmount: number,
  currency: DisplayCurrency,
  rates: WalletExchangeRates,
  periodLabel: string,
): string {
  return `${formatDisplayPrice(usdAmount, currency, rates)} / ${periodLabel}`;
}
