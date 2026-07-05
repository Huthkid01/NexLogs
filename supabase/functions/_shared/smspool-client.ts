const SMSPOOL_API_BASE = 'https://api.smspool.net';

export interface SmsPoolCountry {
  id: string;
  name: string;
  code?: string;
  flag?: string;
}

export interface SmsPricingConfig {
  usdNgnRate: number;
  markupPercent: number;
}

export interface SmsSuggestedCountryPrice {
  countryId: string;
  countryName: string;
  countryCode?: string;
  costUsd: number;
  pool?: string;
  stock?: number | null;
}

export interface SmsPoolPriceOption {
  pool: string;
  poolName: string;
  costUsd: number;
  stock: number | null;
}

function getApiKey() {
  const key = Deno.env.get('SMSPOOL_API_KEY')?.trim();
  if (!key) {
    throw new Error('SMS Pool is not configured. Set SMSPOOL_API_KEY in Supabase Edge Function secrets.');
  }
  return key;
}

function formatSmsPoolCustomerError(payload: Record<string, unknown>) {
  const type = String(payload.type ?? '').toUpperCase();
  const rawMessage = String(payload.message ?? payload.error ?? '').trim();

  switch (type) {
    case 'BALANCE_ERROR':
      return 'Numbers are temporarily unavailable. Please try again shortly or contact support.';
    case 'OUT_OF_STOCK':
    case 'NO_NUMBER':
    case 'NO_NUMBERS':
      return 'No numbers are available for this service and country right now. Try another option.';
    case 'PRICE_NOT_FOUND':
      return 'This service is not available for the selected country.';
    default:
      if (/balance/i.test(rawMessage)) {
        return 'Numbers are temporarily unavailable. Please try again shortly or contact support.';
      }
      if (/stock|available|number/i.test(rawMessage)) {
        return 'No numbers are available for this service and country right now. Try another option.';
      }
      if (rawMessage) {
        return rawMessage;
      }
      return 'Could not complete your request. Please try again.';
  }
}

async function smsPoolPost<T>(path: string, fields: Record<string, string | number | undefined> = {}): Promise<T> {
  const body = new FormData();
  body.append('key', getApiKey());

  for (const [field, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    body.append(field, String(value));
  }

  const response = await fetch(`${SMSPOOL_API_BASE}${path}`, {
    method: 'POST',
    body,
  });

  const raw = await response.text();
  let payload: unknown = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`SMS Pool returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : raw || `SMS Pool request failed (${response.status})`;
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    const success = (payload as { success?: unknown }).success;
    if (success === 0 || success === false) {
      throw new Error(
        formatSmsPoolCustomerError(payload as Record<string, unknown>),
      );
    }
  }

  return payload as T;
}

function normalizeCountry(row: Record<string, unknown>): SmsPoolCountry | null {
  const id = String(row.ID ?? row.id ?? row.country_id ?? '').trim();
  const name = String(row.name ?? row.country ?? row.short_name ?? '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    code: String(row.short_name ?? row.code ?? row.cc ?? '').trim() || undefined,
    flag: String(row.flag ?? row.emoji ?? '').trim() || undefined,
  };
}

function normalizeService(row: Record<string, unknown>): SmsPoolService | null {
  const id = String(row.ID ?? row.id ?? row.service_id ?? '').trim();
  const name = String(row.name ?? row.service ?? '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
  };
}

export async function fetchSmsPoolCountries() {
  const payload = await smsPoolPost<unknown>('/country/retrieve_all');
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Record<string, unknown>[] }).data
      : [];

  return rows
    .map((row) => normalizeCountry(row as Record<string, unknown>))
    .filter((row): row is SmsPoolCountry => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchSmsPoolServices() {
  const payload = await smsPoolPost<unknown>('/service/retrieve_all');
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Record<string, unknown>[] }).data
      : [];

  return rows
    .map((row) => normalizeService(row as Record<string, unknown>))
    .filter((row): row is SmsPoolService => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchSmsPoolBalance() {
  const payload = await smsPoolPost<Record<string, unknown>>('/request/balance');
  return Number(payload.balance ?? 0);
}

export async function fetchSuggestedCountries(service: string) {
  const payload = await smsPoolPost<unknown>('/request/suggested_countries', { service });
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Record<string, unknown>[] }).data
      : [];

  return rows
    .map((row) => {
      const countryId = String(row.country_id ?? row.ID ?? row.id ?? '').trim();
      const countryName = String(row.name ?? row.country ?? '').trim();
      const costUsd = Number(row.price ?? row.cost ?? 0);
      if (!countryId || !countryName || costUsd <= 0) return null;

      return {
        countryId,
        countryName,
        countryCode: String(row.short_name ?? row.code ?? '').trim() || undefined,
        costUsd,
        pool: row.pool !== undefined ? String(row.pool) : undefined,
        stock: parsePoolStock(row as Record<string, unknown>),
      } satisfies SmsSuggestedCountryPrice;
    })
    .filter((row): row is SmsSuggestedCountryPrice => row !== null)
    .sort((a, b) => a.countryName.localeCompare(b.countryName));
}

export async function fetchSmsPoolPrice(country: string, service: string, pool?: string) {
  const payload = await smsPoolPost<Record<string, unknown>>('/request/price', {
    country,
    service,
    pool,
  });
  const cost = Number(payload.price ?? payload.cost ?? payload.amount ?? 0);
  const high = Number(payload.high_price ?? payload.max_price ?? 0);

  return {
    costUsd: cost > 0 ? cost : high,
    raw: payload,
  };
}

function parsePoolStock(row: Record<string, unknown>) {
  for (const key of ['stock', 'amount', 'count', 'available', 'quantity']) {
    const value = Number(row[key]);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return null;
}

export async function fetchSmsPoolStock(country: string, service: string, pool?: string) {
  try {
    const payload = await smsPoolPost<Record<string, unknown>>('/sms/stock', {
      country,
      service,
      pool,
    });

    if (Number(payload.success) === 0) {
      return null;
    }

    const amount = Number(payload.amount ?? payload.stock ?? payload.count ?? 0);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  } catch {
    return null;
  }
}

async function enrichPoolsWithStock(country: string, service: string, pools: SmsPoolPriceOption[]) {
  const enriched: SmsPoolPriceOption[] = [];

  for (const row of pools) {
    if (row.stock !== null) {
      enriched.push(row);
      continue;
    }

    const pool = row.pool === 'default' ? undefined : row.pool;
    const stock = await fetchSmsPoolStock(country, service, pool);
    enriched.push({ ...row, stock });
  }

  return enriched;
}

async function fetchPoolNameMap(country: string, service: string) {
  try {
    const pools = await fetchValidPools(country, service);
    return new Map(pools.map((row) => [row.pool, row.poolName]));
  } catch {
    return new Map<string, string>();
  }
}

export async function fetchPricingPools(country: string, service: string) {
  const payload = await smsPoolPost<unknown>('/request/pricing', { service });
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Record<string, unknown>[] }).data
      : [];

  const nameMap = await fetchPoolNameMap(country, service);

  return rows
    .map((row) => {
      const rowCountry = String(row.country ?? row.country_id ?? '').trim();
      if (rowCountry !== String(country)) return null;

      const pool = String(row.pool ?? row.pool_id ?? '').trim();
      const costUsd = Number(row.price ?? row.cost ?? 0);
      if (!pool || costUsd <= 0) return null;

      return {
        pool,
        poolName: nameMap.get(pool) ?? `Pool ${pool}`,
        costUsd,
        stock: parsePoolStock(row as Record<string, unknown>),
      } satisfies SmsPoolPriceOption;
    })
    .filter((row): row is SmsPoolPriceOption => row !== null)
    .sort((a, b) => a.costUsd - b.costUsd);
}

export async function fetchValidPools(country: string, service: string) {
  const payload = await smsPoolPost<unknown>('/pool/retrieve_valid', {
    country,
    service,
    web: '1',
  });

  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Record<string, unknown>[] }).data
      : [];

  return rows
    .map((row) => {
      const pool = String(row.pool ?? '').trim();
      const costUsd = Number(row.price ?? row.cost ?? 0);
      if (!pool || costUsd <= 0) return null;

      return {
        pool,
        poolName: String(row.name ?? `Pool ${pool}`).trim(),
        costUsd,
        stock: parsePoolStock(row as Record<string, unknown>),
      } satisfies SmsPoolPriceOption;
    })
    .filter((row): row is SmsPoolPriceOption => row !== null)
    .sort((a, b) => a.costUsd - b.costUsd);
}

function dedupePoolOptions(rows: SmsPoolPriceOption[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.pool}:${row.costUsd}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function resolveCountryServicePools(
  country: string,
  service: string,
  countries: SmsPoolCountry[] = [],
) {
  let pools: SmsPoolPriceOption[] = [];

  try {
    pools = await fetchPricingPools(country, service);
  } catch {
    pools = [];
  }

  if (!pools.length) {
    try {
      pools = await fetchValidPools(country, service);
    } catch {
      pools = [];
    }
  }

  if (!pools.length) {
    let suggested: Awaited<ReturnType<typeof fetchSuggestedCountries>> = [];
    try {
      suggested = await fetchSuggestedCountries(service);
    } catch {
      suggested = [];
    }

    const countryMeta = countries.find((row) => String(row.id) === String(country));
    const matches = suggested.filter((row) =>
      String(row.countryId) === String(country) ||
      (countryMeta?.code && row.countryCode?.toUpperCase() === countryMeta.code.toUpperCase()) ||
      row.countryName.toLowerCase() === countryMeta?.name.toLowerCase()
    );

    pools = matches.map((row) => ({
      pool: row.pool ?? 'default',
      poolName: row.pool ? `Pool ${row.pool}` : 'Standard',
      costUsd: row.costUsd,
      stock: row.stock ?? null,
    }));
  }

  if (!pools.length) {
    try {
      const quote = await fetchSmsPoolPrice(country, service);
      if (quote.costUsd > 0) {
        pools = [{
          pool: 'default',
          poolName: 'Standard',
          costUsd: quote.costUsd,
          stock: null,
        }];
      }
    } catch {
      pools = [];
    }
  }

  pools = dedupePoolOptions(pools);
  return enrichPoolsWithStock(country, service, pools);
}

export interface SmsPoolPurchaseResult {
  orderId: string;
  phoneNumber: string;
  costUsd: number;
  expiresAt: string | null;
  raw: Record<string, unknown>;
}

export async function purchaseSmsPoolNumber(
  country: string,
  service: string,
  maxPriceUsd?: number,
  pool?: string,
) {
  const payload = await smsPoolPost<Record<string, unknown>>('/purchase/sms', {
    country,
    service,
    pool,
    max_price: maxPriceUsd,
  });

  const orderId = String(payload.order_id ?? payload.orderid ?? payload.orderID ?? '').trim();
  const cc = String(payload.cc ?? payload.country_code ?? '').trim();
  const localNumber = String(payload.phonenumber ?? payload.number ?? payload.phone ?? '').trim();
  const phoneNumber = localNumber.startsWith('+')
    ? localNumber
    : cc
      ? `+${cc}${localNumber}`
      : localNumber;

  if (!orderId || !phoneNumber) {
    throw new Error('SMS Pool did not return an order ID or phone number.');
  }

  const costUsd = Number(payload.cost ?? payload.price ?? payload.amount ?? 0);
  const expiration = Number(payload.expiration ?? payload.expires_in ?? 0);
  const expiresAt =
    expiration > 1_000_000_000
      ? new Date(expiration * 1000).toISOString()
      : expiration > 0
        ? new Date(Date.now() + expiration * 1000).toISOString()
        : null;

  return {
    orderId,
    phoneNumber,
    costUsd,
    expiresAt,
    raw: payload,
  } satisfies SmsPoolPurchaseResult;
}

export interface SmsPoolCheckResult {
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  code: string | null;
  message: string | null;
  timeLeftSeconds: number | null;
  /** SMS Pool status 6 — provider already refunded the number on their side. */
  providerRefunded: boolean;
  raw: Record<string, unknown>;
}

export async function checkSmsPoolOrder(orderId: string): Promise<SmsPoolCheckResult> {
  const payload = await smsPoolPost<Record<string, unknown>>('/sms/check', { orderid: orderId });
  const statusCode = Number(payload.status ?? 0);
  const fullSms = String(payload.full_sms ?? payload.message ?? '').trim();
  const sms = String(payload.sms ?? '').trim();
  const timeLeft = Number(payload.time_left ?? payload.timeleft ?? 0);
  const code = resolveSmsPoolCheckCode(payload);

  let status: SmsPoolCheckResult['status'] = 'pending';
  if (code) {
    status = 'completed';
  } else if (statusCode === 6 || statusCode === 5) {
    status = 'cancelled';
  } else if (statusCode === 2 || statusCode === 4) {
    status = 'expired';
  }

  return {
    status,
    code,
    message: fullSms || sms || null,
    timeLeftSeconds: Number.isFinite(timeLeft) && timeLeft > 0 ? timeLeft : null,
    providerRefunded: statusCode === 6,
    raw: payload,
  };
}

export async function cancelSmsPoolOrder(orderId: string) {
  return smsPoolPost<Record<string, unknown>>('/sms/cancel', { orderid: orderId });
}

export interface SmsPoolActiveOrder {
  orderId: string;
  phoneNumber: string;
  service: string | null;
  countryCode: string | null;
  status: SmsPoolCheckResult['status'];
  code: string | null;
  message: string | null;
  timeLeftSeconds: number | null;
  expiresAt: string | null;
  providerRefunded: boolean;
  raw: Record<string, unknown>;
}

export interface SmsPoolHistoryOrder {
  orderId: string;
  phoneNumber: string | null;
  service: string | null;
  countryCode: string | null;
  status: string | null;
  code: string | null;
  costUsd: number | null;
  createdAt: string | null;
  raw: Record<string, unknown>;
}

function mapSmsPoolStatus(value: unknown): SmsPoolCheckResult['status'] {
  const statusCode = Number(value);
  if (statusCode === 6 || statusCode === 5 || String(value).toLowerCase() === 'cancelled') {
    return 'cancelled';
  }
  if (statusCode === 3 || String(value).toLowerCase() === 'completed') {
    return 'completed';
  }
  if (statusCode === 2 || statusCode === 4 || String(value).toLowerCase() === 'expired') {
    return 'expired';
  }
  return 'pending';
}

function normalizeSmsPoolOrderId(row: Record<string, unknown>) {
  return String(
    row.order_code ?? row.orderid ?? row.order_id ?? row.orderID ?? row.id ?? '',
  ).trim();
}

function normalizeSmsPoolPhone(row: Record<string, unknown>) {
  const cc = String(row.cc ?? row.country_code ?? row.short_name ?? '').trim();
  const localNumber = String(
    row.phonenumber ?? row.phone_number ?? row.number ?? row.phone ?? '',
  ).trim();

  if (!localNumber) return '';
  if (localNumber.startsWith('+')) return localNumber;
  if (cc && /^\d+$/.test(cc)) return `+${cc}${localNumber}`;
  return localNumber;
}

export async function fetchActiveSmsPoolOrders(): Promise<SmsPoolActiveOrder[]> {
  const payload = await smsPoolPost<unknown>('/request/active');
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Record<string, unknown>[] }).data
      : payload && typeof payload === 'object' && Array.isArray((payload as { orders?: unknown }).orders)
        ? (payload as { orders: Record<string, unknown>[] }).orders
        : [];

  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      const orderId = normalizeSmsPoolOrderId(record);
      if (!orderId) return null;

      const fullSms = String(record.full_sms ?? record.full_code ?? record.message ?? '').trim();
      const sms = String(record.sms ?? '').trim();
      const statusCode = Number(record.status ?? 0);
      const providerRefunded = statusCode === 6;
      const mappedStatus = mapSmsPoolStatus(record.status);
      const code = normalizeSmsVerificationCode(sms, fullSms || undefined);
      const status = code ? 'completed' : mappedStatus === 'completed' ? 'pending' : mappedStatus;
      const timeLeft = Number(record.time_left ?? record.timeleft ?? 0);
      const expiration = Number(record.expiration ?? record.expiry ?? 0);
      const expiresAt =
        expiration > 1_000_000_000
          ? new Date(expiration * 1000).toISOString()
          : timeLeft > 0
            ? new Date(Date.now() + timeLeft * 1000).toISOString()
            : null;

      return {
        orderId,
        phoneNumber: normalizeSmsPoolPhone(record),
        service: String(record.service ?? record.service_name ?? '').trim() || null,
        countryCode: String(record.short_name ?? record.country_code ?? '').trim() || null,
        status,
        code,
        message: fullSms || sms || null,
        timeLeftSeconds: Number.isFinite(timeLeft) && timeLeft > 0 ? timeLeft : null,
        expiresAt,
        providerRefunded,
        raw: record,
      } satisfies SmsPoolActiveOrder;
    })
    .filter((row): row is SmsPoolActiveOrder => row !== null);
}

export async function fetchSmsPoolOrderHistory(): Promise<SmsPoolHistoryOrder[]> {
  const payload = await smsPoolPost<unknown>('/request/history');
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { history?: unknown }).history)
      ? (payload as { history: Record<string, unknown>[] }).history
      : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: Record<string, unknown>[] }).data
        : [];

  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      const orderId = normalizeSmsPoolOrderId(record);
      if (!orderId) return null;

      const fullSms = String(record.full_sms ?? record.full_code ?? record.message ?? '').trim();
      const sms = String(record.sms ?? '').trim();
      const code = normalizeSmsVerificationCode(sms, fullSms || undefined);
      const timestamp = String(record.timestamp ?? record.date ?? record.created_at ?? '').trim();
      const costUsd = Number(record.cost ?? record.price ?? record.amount ?? NaN);

      return {
        orderId,
        phoneNumber: normalizeSmsPoolPhone(record) || null,
        service: String(record.service ?? record.service_name ?? '').trim() || null,
        countryCode: String(record.short_name ?? record.country_code ?? '').trim() || null,
        status: String(record.status ?? record.state ?? '').trim() || null,
        code: code || null,
        costUsd: Number.isFinite(costUsd) ? costUsd : null,
        createdAt: timestamp || null,
        raw: record,
      } satisfies SmsPoolHistoryOrder;
    })
    .filter((row): row is SmsPoolHistoryOrder => row !== null);
}

export async function resendSmsPoolOrder(orderId: string) {
  return smsPoolPost<Record<string, unknown>>('/sms/resend', { orderid: orderId });
}

function extractCodeFromSms(message: string) {
  if (!message) return '';
  const match = message.match(/\b(\d{4,8})\b/);
  return match?.[1] ?? '';
}

export function isValidSmsVerificationCode(code: unknown): boolean {
  const normalized = String(code ?? '').trim();
  if (!normalized) return false;
  if (normalized === '0') return false;
  if (/^0+$/.test(normalized)) return false;
  if (/^\d{4,8}$/.test(normalized)) return true;
  if (normalized.length >= 4 && /^[a-zA-Z0-9]+$/.test(normalized)) return true;
  return false;
}

export function normalizeSmsVerificationCode(
  primary: unknown,
  fallbackMessage?: unknown,
): string | null {
  const smsText = String(fallbackMessage ?? '').trim();
  const candidates = [
    String(primary ?? '').trim(),
    smsText,
    extractCodeFromSms(smsText),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (isValidSmsVerificationCode(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveSmsPoolCheckCode(payload: Record<string, unknown>): string | null {
  const sms = String(payload.sms ?? '').trim();
  const fullSms = String(payload.full_sms ?? payload.message ?? '').trim();
  return normalizeSmsVerificationCode(sms, fullSms || undefined);
}

const DEFAULT_SMS_USD_NGN_RATE = 1500;

function normalizeUsdNgnRate(value: unknown, fallback: number) {
  const rate = Number(value);
  return rate > 0 ? rate : fallback;
}

function normalizeMarkupPercent(value: unknown, fallback: number) {
  const markup = Number(value);
  return markup >= 0 ? markup : fallback;
}

export function getSmsPricingConfigFromEnv(): SmsPricingConfig {
  const usdNgnRate = Number(Deno.env.get('SMSPOOL_USD_NGN_RATE') ?? String(DEFAULT_SMS_USD_NGN_RATE));
  const markupPercent = Number(Deno.env.get('SMSPOOL_MARKUP_PERCENT') ?? '50');

  return {
    usdNgnRate: usdNgnRate > 0 ? usdNgnRate : DEFAULT_SMS_USD_NGN_RATE,
    markupPercent: markupPercent >= 0 ? markupPercent : 50,
  };
}

export async function loadSmsPricingConfig(
  client: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { value?: unknown } | null; error: unknown }>;
        };
      };
    };
  },
  provider: 'smspool' | 'fivesim' = 'smspool',
): Promise<SmsPricingConfig> {
  const envDefaults = getSmsPricingConfigFromEnv();

  try {
    const { data } = await client
      .from('site_content_blocks')
      .select('value')
      .eq('key', 'smsPricing')
      .maybeSingle();

    const value =
      data?.value && typeof data.value === 'object'
        ? data.value as Record<string, unknown>
        : null;

    if (value && ('smspool' in value || 'fivesim' in value)) {
      const providerValue = value[provider];
      if (providerValue && typeof providerValue === 'object') {
        const settings = providerValue as { usdNgnRate?: unknown; markupPercent?: unknown };
        return {
          usdNgnRate: normalizeUsdNgnRate(settings.usdNgnRate, envDefaults.usdNgnRate),
          markupPercent: normalizeMarkupPercent(settings.markupPercent, envDefaults.markupPercent),
        };
      }
    }

    return {
      usdNgnRate: normalizeUsdNgnRate(value?.usdNgnRate, envDefaults.usdNgnRate),
      markupPercent: normalizeMarkupPercent(value?.markupPercent, envDefaults.markupPercent),
    };
  } catch {
    return envDefaults;
  }
}

export function calculateSmsChargeNgn(costUsd: number, config: SmsPricingConfig) {
  const base = costUsd * config.usdNgnRate;
  return Math.max(Math.ceil(base * (1 + config.markupPercent / 100)), 50);
}

export function calculateSmsProfitNgn(costUsd: number, config: SmsPricingConfig) {
  const base = costUsd * config.usdNgnRate;
  return Math.max(Math.ceil(base * (config.markupPercent / 100)), 0);
}

/** @deprecated Use loadSmsPricingConfig + calculateSmsChargeNgn */
export function getSmsPricingConfig() {
  return getSmsPricingConfigFromEnv();
}

export function convertUsdToNgnCharge(costUsd: number, config: SmsPricingConfig = getSmsPricingConfigFromEnv()) {
  return calculateSmsChargeNgn(costUsd, config);
}
