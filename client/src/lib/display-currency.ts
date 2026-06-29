import { formatNgnPrice } from '@/lib/utils';

/** Format NGN-stored amounts (wallet balance, product prices). */
export function formatDisplayPrice(ngnAmount: number): string {
  return formatNgnPrice(ngnAmount);
}

export function formatDisplayPriceWithPeriod(ngnAmount: number, periodLabel: string): string {
  return `${formatDisplayPrice(ngnAmount)} / ${periodLabel}`;
}
