export const DEPOSIT_CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'] as const;

export type DepositCurrency = (typeof DEPOSIT_CURRENCIES)[number];

export const DISPLAY_RATE_CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'XOF', name: 'West African CFA Franc' },
  { code: 'XAF', name: 'Central African CFA Franc' },
] as const;

export type WalletExchangeRates = Record<string, number>;

export const DEFAULT_WALLET_EXCHANGE_RATES: WalletExchangeRates = {
  NGN: 1500,
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  GHS: 11.67,
  KES: 134.56,
  ZAR: 16.52,
  XOF: 565.62,
  XAF: 565.62,
};

export const ADMIN_RATE_FIELDS = [
  { code: 'NGN', label: 'Nigerian Naira (NGN)', helper: 'How much NGN equals 1 USD. Example: 1500 means ₦1,500 = $1.' },
  { code: 'EUR', label: 'Euro (EUR)', helper: 'How much EUR equals 1 USD.' },
  { code: 'GBP', label: 'British Pound (GBP)', helper: 'How much GBP equals 1 USD.' },
  { code: 'GHS', label: 'Ghanaian Cedi (GHS)', helper: 'Shown on the public exchange rates panel.' },
  { code: 'KES', label: 'Kenyan Shilling (KES)', helper: 'Shown on the public exchange rates panel.' },
  { code: 'ZAR', label: 'South African Rand (ZAR)', helper: 'Shown on the public exchange rates panel.' },
  { code: 'XOF', label: 'West African CFA Franc (XOF)', helper: 'Shown on the public exchange rates panel.' },
  { code: 'XAF', label: 'Central African CFA Franc (XAF)', helper: 'Shown on the public exchange rates panel.' },
] as const;

export function normalizeWalletExchangeRates(
  rates?: Partial<WalletExchangeRates> | null,
): WalletExchangeRates {
  const normalized: WalletExchangeRates = { ...DEFAULT_WALLET_EXCHANGE_RATES };

  if (rates) {
    for (const [key, value] of Object.entries(rates)) {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        normalized[key] = value;
      }
    }
  }

  return normalized;
}

const WALLET_USD_DECIMALS = 6;

export function convertCurrencyToUsd(
  amount: number,
  currency: string,
  rates: WalletExchangeRates,
): number {
  const code = currency.toUpperCase();
  const rate = rates[code];

  if (!rate || rate <= 0 || Number.isNaN(amount) || amount <= 0) {
    return 0;
  }

  return Math.round((amount / rate) * 100) / 100;
}

/** Higher precision for wallet deposits so NGN balances round-trip correctly (500 NGN stays 500, not 493). */
export function convertCurrencyToUsdForWallet(
  amount: number,
  currency: string,
  rates: WalletExchangeRates,
): number {
  const code = currency.toUpperCase();
  const rate = rates[code];

  if (!rate || rate <= 0 || Number.isNaN(amount) || amount <= 0) {
    return 0;
  }

  const factor = 10 ** WALLET_USD_DECIMALS;
  return Math.round((amount / rate) * factor) / factor;
}

export function convertUsdToCurrency(usdAmount: number, ratePerUsd: number) {
  if (!ratePerUsd || ratePerUsd <= 0 || usdAmount <= 0) return 0;
  return usdAmount * ratePerUsd;
}

export function formatRatePerUsd(currency: string, rate: number) {
  return `1 USD = ${rate.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
