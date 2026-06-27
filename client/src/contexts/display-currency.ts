import { createContext } from 'react';

export type DisplayCurrency = 'USD' | 'NGN';

export const DISPLAY_CURRENCY_STORAGE_KEY = 'nexlogs-display-currency';
export const DISPLAY_CURRENCY_LOGIN_RESET_EVENT = 'nexlogs-display-currency-login-reset';

export function resetDisplayCurrencyForLogin() {
  localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, 'NGN');
  window.dispatchEvent(new Event(DISPLAY_CURRENCY_LOGIN_RESET_EVENT));
}

export interface DisplayCurrencyContextType {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  toggleCurrency: () => void;
}

export const DisplayCurrencyContext = createContext<DisplayCurrencyContextType | undefined>(undefined);
