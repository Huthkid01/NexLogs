import { useCallback } from 'react';
import { formatDisplayPrice } from '@/lib/display-currency';

/** Format NGN-stored amounts (products, wallet balance). */
export function useFormatDisplayPrice() {
  const formatDisplayAmount = useCallback(
    (ngnAmount: number) => formatDisplayPrice(ngnAmount),
    [],
  );

  return { currency: 'NGN' as const, formatDisplayAmount, formatProductPrice: formatDisplayAmount };
}
