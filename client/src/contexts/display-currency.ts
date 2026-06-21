import { createContext } from 'react';

export type DisplayCurrency = 'USD' | 'NGN';

export const DISPLAY_CURRENCY_STORAGE_KEY = 'nexlogs-display-currency';

export interface DisplayCurrencyContextType {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  toggleCurrency: () => void;
}

export const DisplayCurrencyContext = createContext<DisplayCurrencyContextType | undefined>(undefined);
