/** SMS Pool prices are USD — this rate converts provider cost to NGN for customers. */
export interface SmsPricingSettings {
  usdNgnRate: number;
  markupPercent: number;
}

export type SmsPricingConfig = SmsPricingSettings;

export const DEFAULT_SMS_PRICING: SmsPricingSettings = {
  usdNgnRate: 1500,
  markupPercent: 50,
};

export type SmsPricingProvider = 'smspool' | 'fivesim';

export interface SmsProviderPricingBundle {
  smspool: SmsPricingSettings;
  fivesim: SmsPricingSettings;
}

export function normalizeSmsPricing(value?: Partial<SmsPricingSettings> | null): SmsPricingSettings {
  const usdNgnRate = Number(value?.usdNgnRate);
  const markupPercent = Number(value?.markupPercent);

  return {
    usdNgnRate: usdNgnRate > 0 ? usdNgnRate : DEFAULT_SMS_PRICING.usdNgnRate,
    markupPercent: markupPercent >= 0 ? markupPercent : DEFAULT_SMS_PRICING.markupPercent,
  };
}

export function normalizeSmsProviderPricing(
  value?: Partial<SmsProviderPricingBundle> | Partial<SmsPricingSettings> | null,
): SmsProviderPricingBundle {
  if (value && typeof value === 'object' && ('smspool' in value || 'fivesim' in value)) {
    const bundle = value as Partial<SmsProviderPricingBundle>;
    return {
      smspool: normalizeSmsPricing(bundle.smspool),
      fivesim: normalizeSmsPricing(bundle.fivesim),
    };
  }

  const legacy = normalizeSmsPricing(value as Partial<SmsPricingSettings> | null);
  return {
    smspool: legacy,
    fivesim: { ...legacy },
  };
}

export function getSmsPricingForProvider(
  bundle: SmsProviderPricingBundle,
  provider: SmsPricingProvider,
): SmsPricingSettings {
  return bundle[provider];
}

export function calculateSmsCostNgn(costUsd: number, usdNgnRate: number) {
  return Math.max(Math.ceil(costUsd * usdNgnRate), 0);
}

export function calculateSmsChargeNgn(costUsd: number, config: Pick<SmsPricingConfig, 'markupPercent' | 'usdNgnRate'>) {
  const baseNgn = calculateSmsCostNgn(costUsd, config.usdNgnRate);
  return Math.max(Math.ceil(baseNgn * (1 + config.markupPercent / 100)), 50);
}

export function calculateSmsProfitNgn(costUsd: number, config: Pick<SmsPricingConfig, 'markupPercent' | 'usdNgnRate'>) {
  const baseNgn = calculateSmsCostNgn(costUsd, config.usdNgnRate);
  return Math.max(Math.ceil(baseNgn * (config.markupPercent / 100)), 0);
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}
