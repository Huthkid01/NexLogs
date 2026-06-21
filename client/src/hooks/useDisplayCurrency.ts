import { useContext } from 'react';
import { DisplayCurrencyContext } from '@/contexts/display-currency';

export function useDisplayCurrency() {
  const context = useContext(DisplayCurrencyContext);
  if (!context) throw new Error('useDisplayCurrency must be used within DisplayCurrencyProvider');
  return context;
}
