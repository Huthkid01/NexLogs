import { type ReactNode } from 'react';
import {
  DisplayCurrencyContext,
  type DisplayCurrency,
} from '@/contexts/display-currency';

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const currency: DisplayCurrency = 'NGN';

  return (
    <DisplayCurrencyContext.Provider
      value={{
        currency,
        setCurrency: () => {},
        toggleCurrency: () => {},
      }}
    >
      {children}
    </DisplayCurrencyContext.Provider>
  );
}
