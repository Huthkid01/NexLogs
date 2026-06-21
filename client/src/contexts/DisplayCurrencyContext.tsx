import { useEffect, useState, type ReactNode } from 'react';
import {
  DISPLAY_CURRENCY_STORAGE_KEY,
  DisplayCurrencyContext,
  type DisplayCurrency,
} from '@/contexts/display-currency';

function getStoredCurrency(): DisplayCurrency {
  const stored = localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
  return stored === 'NGN' ? 'NGN' : 'USD';
}

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(() => getStoredCurrency());

  useEffect(() => {
    localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = (next: DisplayCurrency) => {
    setCurrencyState(next);
  };

  const toggleCurrency = () => {
    setCurrencyState((current) => (current === 'USD' ? 'NGN' : 'USD'));
  };

  return (
    <DisplayCurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}
