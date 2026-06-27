import { useCallback } from 'react';
import { formatDisplayPrice } from '@/lib/display-currency';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { useSiteContent } from '@/hooks/useSiteContent';

/** Format USD-stored amounts (products, wallet) in the user's display currency (default NGN after login). */
export function useFormatDisplayPrice() {
  const { currency } = useDisplayCurrency();
  const { content } = useSiteContent();
  const rates = content.wallet.exchangeRates;

  const formatDisplayAmount = useCallback(
    (usdAmount: number) => formatDisplayPrice(usdAmount, currency, rates),
    [currency, rates],
  );

  return { currency, formatDisplayAmount, formatProductPrice: formatDisplayAmount };
}
