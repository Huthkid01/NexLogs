import { useCallback } from 'react';
import { formatDisplayPrice } from '@/lib/display-currency';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { useSiteContent } from '@/hooks/useSiteContent';

/** Format marketplace product prices in the user's chosen display currency (default NGN after login). */
export function useFormatDisplayPrice() {
  const { currency } = useDisplayCurrency();
  const { content } = useSiteContent();
  const rates = content.wallet.exchangeRates;

  const formatProductPrice = useCallback(
    (usdAmount: number) => formatDisplayPrice(usdAmount, currency, rates),
    [currency, rates],
  );

  return { currency, formatProductPrice };
}
