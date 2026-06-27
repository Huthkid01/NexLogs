import { useEffect, useState, type ReactNode } from 'react';
import {
  DISPLAY_CURRENCY_LOGIN_RESET_EVENT,
  DISPLAY_CURRENCY_STORAGE_KEY,
  DisplayCurrencyContext,
  type DisplayCurrency,
} from '@/contexts/display-currency';

function getStoredCurrency(): DisplayCurrency {
  const stored = localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
  if (stored === 'USD') return 'USD';
  return 'NGN';
}

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(() => getStoredCurrency());

  useEffect(() => {
    const handleLoginReset = () => setCurrencyState('NGN');
    window.addEventListener(DISPLAY_CURRENCY_LOGIN_RESET_EVENT, handleLoginReset);
    return () => window.removeEventListener(DISPLAY_CURRENCY_LOGIN_RESET_EVENT, handleLoginReset);
  }, []);

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
