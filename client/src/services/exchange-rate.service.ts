export const DISPLAY_RATE_CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'XOF', name: 'West African CFA Franc' },
  { code: 'XAF', name: 'Central African CFA Franc' },
] as const;

export type DisplayRateCurrency = (typeof DISPLAY_RATE_CURRENCIES)[number]['code'];

interface ErApiResponse {
  result: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

export interface UsdExchangeRates {
  updatedAt: string;
  rates: Record<DisplayRateCurrency, number>;
}

const FALLBACK_RATES: Record<DisplayRateCurrency, number> = {
  NGN: 1425.12,
  GHS: 11.67,
  KES: 134.56,
  ZAR: 16.52,
  XOF: 565.62,
  XAF: 565.62,
};

export async function fetchUsdExchangeRates(): Promise<UsdExchangeRates> {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');

  if (!response.ok) {
    throw new Error('Failed to fetch exchange rates');
  }

  const data = (await response.json()) as ErApiResponse;

  if (data.result !== 'success') {
    throw new Error('Invalid exchange rate response');
  }

  const rates = DISPLAY_RATE_CURRENCIES.reduce(
    (acc, { code }) => {
      const rate = data.rates[code];
      if (typeof rate !== 'number') {
        throw new Error(`Missing rate for ${code}`);
      }
      acc[code] = rate;
      return acc;
    },
    {} as Record<DisplayRateCurrency, number>
  );

  return {
    updatedAt: data.time_last_update_utc,
    rates,
  };
}

export function getFallbackUsdExchangeRates(): UsdExchangeRates {
  return {
    updatedAt: 'fallback',
    rates: { ...FALLBACK_RATES },
  };
}

export function convertUsdToCurrency(usdAmount: number, ratePerUsd: number) {
  return usdAmount * ratePerUsd;
}
