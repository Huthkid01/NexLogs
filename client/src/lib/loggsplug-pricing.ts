export interface LoggsplugSettings {
  enabled: boolean;
  defaultMarkupPercent: number;
  lastSyncedAt: string | null;
}

export const DEFAULT_LOGGSPLUG_SETTINGS: LoggsplugSettings = {
  enabled: true,
  defaultMarkupPercent: 15,
  lastSyncedAt: null,
};

export function normalizeLoggsplugSettings(value?: Partial<LoggsplugSettings> | null): LoggsplugSettings {
  const markup = Number(value?.defaultMarkupPercent);
  return {
    enabled: value?.enabled !== false,
    defaultMarkupPercent: Number.isFinite(markup) && markup >= 0 ? markup : DEFAULT_LOGGSPLUG_SETTINGS.defaultMarkupPercent,
    lastSyncedAt: typeof value?.lastSyncedAt === 'string' ? value.lastSyncedAt : null,
  };
}

export function calculateLoggsplugRetailPrice(costNgn: number, markupPercent: number) {
  const safeCost = Number.isFinite(costNgn) ? costNgn : 0;
  const safeMarkup = Number.isFinite(markupPercent) ? markupPercent : 0;
  return Math.max(Math.round(safeCost * (1 + safeMarkup / 100)), 0);
}

export function calculateLoggsplugProfit(costNgn: number, markupPercent: number) {
  return Math.max(calculateLoggsplugRetailPrice(costNgn, markupPercent) - costNgn, 0);
}

export function resolveLoggsplugMarkup(
  settings: LoggsplugSettings,
  productOverride?: number | null,
) {
  const override = productOverride == null ? null : Number(productOverride);
  if (override != null && Number.isFinite(override) && override >= 0) {
    return override;
  }
  return settings.defaultMarkupPercent;
}
