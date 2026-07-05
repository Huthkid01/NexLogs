import {
  isValidSmsVerificationCode,
  normalizeSmsVerificationCode,
} from './smspool-client.ts';

const FIVESIM_API_BASE = 'https://5sim.net/v1';

export interface FiveSimCountry {
  id: string;
  name: string;
  code?: string;
}

export interface FiveSimService {
  id: string;
  name: string;
}

export interface FiveSimPriceOption {
  pool: string;
  poolName: string;
  costUsd: number;
  stock: number | null;
}

export interface FiveSimPurchaseResult {
  orderId: string;
  phoneNumber: string;
  costUsd: number;
  expiresAt: string | null;
  raw: Record<string, unknown>;
}

export interface FiveSimCheckResult {
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  code: string | null;
  message: string | null;
  timeLeftSeconds: number | null;
  providerRefunded: boolean;
  raw: Record<string, unknown>;
}

const OPERATOR_FALLBACKS = ['any', 'virtual8', 'virtual4', 'virtual12', 'virtual16', 'virtual21'];
const SERVICE_NAME_OVERRIDES: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram/Threads',
  tiktok: 'TikTok/Douyin',
  snapchat: 'Snapchat',
  twitter: 'Twitter/X',
  discord: 'Discord',
  microsoft: 'Microsoft',
  apple: 'Apple',
  openai: 'OpenAI/ChatGPT',
  viber: 'Viber',
};

function getApiKey() {
  const key = Deno.env.get('FIVESIM_API_KEY')?.trim();
  if (!key) {
    throw new Error('5sim is not configured. Set FIVESIM_API_KEY in Supabase Edge Function secrets.');
  }
  return key;
}

function formatFiveSimCustomerError(status: number, payload: unknown) {
  const record = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};
  const rawMessage = String(record.message ?? record.error ?? record.detail ?? '').trim();

  if (status === 401 || status === 403) {
    return '5sim authentication failed. Check the API key configuration.';
  }
  if (status === 400 && /no free phones|not enough|stock|available/i.test(rawMessage)) {
    return 'No numbers are available for this service and country right now. Try another option.';
  }
  if (/balance|not enough user balance/i.test(rawMessage)) {
    return 'Numbers are temporarily unavailable. Please try again shortly or contact support.';
  }
  if (rawMessage) return rawMessage;
  return 'Could not complete your request. Please try again.';
}

async function fiveSimRequest<T>(
  path: string,
  options: { auth?: boolean; method?: string; body?: Record<string, unknown> } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.auth !== false) {
    headers.Authorization = `Bearer ${getApiKey()}`;
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${FIVESIM_API_BASE}${path}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

  if (!response.ok) {
    throw new Error(formatFiveSimCustomerError(response.status, payload));
  }

  return payload as T;
}

export function normalizeFiveSimPriceUsd(value: unknown): number {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (price < 1) return price;
  return price / 1000;
}

export function normalizeFiveSimBalanceUsd(value: unknown): number {
  const balance = Number(value);
  if (!Number.isFinite(balance) || balance < 0) return 0;
  return balance;
}

function formatServiceName(serviceId: string) {
  const override = SERVICE_NAME_OVERRIDES[serviceId.toLowerCase()];
  if (override) return override;

  return serviceId
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatOperatorName(operator: string) {
  if (operator === 'any') return 'Any operator';
  return operator
    .replace(/^virtual(\d+)$/i, 'Virtual $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseProductStock(record: Record<string, unknown>) {
  const stock = Number(record.Qty ?? record.qty ?? record.count ?? record.amount ?? 0);
  return Number.isFinite(stock) && stock > 0 ? stock : 0;
}

function parseGuestPriceCostUsd(value: unknown): number {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return price;
}

function parseProductCostUsd(record: Record<string, unknown>) {
  return normalizeFiveSimPriceUsd(record.Price ?? record.price ?? record.cost);
}

function extractCountryCode(record: Record<string, unknown>): string | undefined {
  const iso = record.iso;
  if (iso && typeof iso === 'object' && !Array.isArray(iso)) {
    const key = Object.keys(iso as Record<string, unknown>)[0];
    if (key) return key.toUpperCase();
  }

  const prefix = record.prefix;
  if (prefix && typeof prefix === 'object' && !Array.isArray(prefix)) {
    const key = Object.keys(prefix as Record<string, unknown>)[0];
    if (key) return key.replace(/^\+/, '');
  }

  const code = String(record.code ?? '').trim();
  return code || undefined;
}

function normalizeCountryRecord(id: string, record: Record<string, unknown>): FiveSimCountry | null {
  const slug = String(id).trim();
  if (!slug) return null;

  const name = String(
    record.text_en ?? record.text ?? record.name ?? record.title ?? slug,
  ).trim();

  return {
    id: slug,
    name: name || slug,
    code: extractCountryCode(record),
  };
}

function normalizeProductsPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return {} as Record<string, Record<string, unknown>>;
  return payload as Record<string, Record<string, unknown>>;
}

export async function fetchFiveSimCountries(): Promise<FiveSimCountry[]> {
  const payload = await fiveSimRequest<Record<string, Record<string, unknown>>>('/guest/countries', {
    auth: false,
  });

  return Object.entries(payload)
    .map(([id, record]) => normalizeCountryRecord(id, record))
    .filter((row): row is FiveSimCountry => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchFiveSimServices(): Promise<FiveSimService[]> {
  const payload = await fiveSimRequest<Record<string, Record<string, unknown>>>('/guest/products/any/any', {
    auth: false,
  });
  const products = normalizeProductsPayload(payload);

  return Object.keys(products)
    .map((id) => ({
      id,
      name: formatServiceName(id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface FiveSimServicePriceRow {
  countryId: string;
  countryName: string;
  countryCode?: string;
  operator: string;
  operatorName: string;
  costUsd: number;
  stock: number;
}

function pickBestOperatorPrice(operators: Record<string, unknown>) {
  let best: { operator: string; costUsd: number; stock: number } | null = null;

  for (const [operator, info] of Object.entries(operators)) {
    if (!info || typeof info !== 'object') continue;
    const record = info as Record<string, unknown>;
    const costUsd = parseGuestPriceCostUsd(record.cost ?? record.price);
    const stock = Number(record.count ?? record.qty ?? record.Qty ?? 0);
    if (costUsd <= 0 || !Number.isFinite(stock) || stock <= 0) continue;

    if (!best || costUsd < best.costUsd || (costUsd === best.costUsd && stock > best.stock)) {
      best = { operator, costUsd, stock };
    }
  }

  return best;
}

export async function fetchFiveSimServicePrices(service: string): Promise<FiveSimServicePriceRow[]> {
  const payload = await fiveSimRequest<Record<string, unknown>>(
    `/guest/prices?product=${encodeURIComponent(service)}`,
    { auth: false },
  );

  const productBlock = payload[service];
  if (!productBlock || typeof productBlock !== 'object' || Array.isArray(productBlock)) {
    return [];
  }

  const countries = await fetchFiveSimCountries().catch(() => []);
  const countryMap = new Map(countries.map((row) => [row.id, row]));
  const rows: FiveSimServicePriceRow[] = [];

  for (const [countryId, operators] of Object.entries(productBlock as Record<string, unknown>)) {
    if (!operators || typeof operators !== 'object' || Array.isArray(operators)) continue;

    const best = pickBestOperatorPrice(operators as Record<string, unknown>);
    if (!best) continue;

    const meta = countryMap.get(countryId);
    rows.push({
      countryId,
      countryName: meta?.name ?? countryId,
      countryCode: meta?.code,
      operator: best.operator,
      operatorName: formatOperatorName(best.operator),
      costUsd: best.costUsd,
      stock: best.stock,
    });
  }

  return rows.sort((a, b) => a.countryName.localeCompare(b.countryName));
}

function mapOperatorsToPriceOptions(operators: Record<string, unknown>): FiveSimPriceOption[] {
  const rows: FiveSimPriceOption[] = [];

  for (const [operator, info] of Object.entries(operators)) {
    if (!info || typeof info !== 'object') continue;
    const record = info as Record<string, unknown>;
    const costUsd = parseGuestPriceCostUsd(record.cost ?? record.price);
    const stock = Number(record.count ?? record.qty ?? record.Qty ?? 0);
    if (costUsd <= 0 || !Number.isFinite(stock) || stock <= 0) continue;

    rows.push({
      pool: operator,
      poolName: formatOperatorName(operator),
      costUsd,
      stock,
    });
  }

  return rows.sort((a, b) => a.costUsd - b.costUsd || a.poolName.localeCompare(b.poolName));
}

async function fetchCountryServicePricesFromGuestApi(
  country: string,
  service: string,
): Promise<FiveSimPriceOption[]> {
  try {
    const payload = await fiveSimRequest<Record<string, unknown>>(
      `/guest/prices?country=${encodeURIComponent(country)}&product=${encodeURIComponent(service)}`,
      { auth: false },
    );

    const countryBlock = payload[country];
    if (!countryBlock || typeof countryBlock !== 'object' || Array.isArray(countryBlock)) {
      return [];
    }

    const serviceBlock = (countryBlock as Record<string, unknown>)[service];
    if (!serviceBlock || typeof serviceBlock !== 'object' || Array.isArray(serviceBlock)) {
      return [];
    }

    return mapOperatorsToPriceOptions(serviceBlock as Record<string, unknown>);
  } catch {
    return [];
  }
}

async function fetchCountryOperators(country: string) {
  try {
    const payload = await fiveSimRequest<Record<string, Record<string, unknown>>>('/guest/countries', {
      auth: false,
    });
    const countryRecord = payload[country];
    const operators = countryRecord?.operators;
    if (operators && typeof operators === 'object') {
      return Object.keys(operators as Record<string, unknown>);
    }
  } catch {
    // Fall through to defaults.
  }

  return OPERATOR_FALLBACKS;
}

async function fetchOperatorProductOption(
  country: string,
  operator: string,
  service: string,
): Promise<FiveSimPriceOption | null> {
  try {
    const payload = await fiveSimRequest<Record<string, Record<string, unknown>>>(
      `/guest/products/${encodeURIComponent(country)}/${encodeURIComponent(operator)}`,
      { auth: false },
    );
    const products = normalizeProductsPayload(payload);
    const record = products[service];
    if (!record) return null;

    const costUsd = parseProductCostUsd(record);
    const stock = parseProductStock(record);
    if (costUsd <= 0 || stock <= 0) return null;

    return {
      pool: operator,
      poolName: formatOperatorName(operator),
      costUsd,
      stock,
    };
  } catch {
    return null;
  }
}

export async function resolveCountryServicePools(country: string, service: string) {
  const fromPricesApi = await fetchCountryServicePricesFromGuestApi(country, service);
  if (fromPricesApi.length) return fromPricesApi;

  const operators = await fetchCountryOperators(country);
  const candidates = [...new Set([...OPERATOR_FALLBACKS, ...operators])];
  const rows: FiveSimPriceOption[] = [];
  const seen = new Set<string>();

  await Promise.all(candidates.slice(0, 8).map(async (operator) => {
    const option = await fetchOperatorProductOption(country, operator, service);
    if (!option || seen.has(option.pool)) return;
    seen.add(option.pool);
    rows.push(option);
  }));

  return rows.sort((a, b) => a.costUsd - b.costUsd || a.poolName.localeCompare(b.poolName));
}

export async function fetchFiveSimBalance() {
  try {
    const balancePayload = await fiveSimRequest<Record<string, unknown>>('/user/balance');
    const balance = normalizeFiveSimBalanceUsd(
      balancePayload.balance ?? balancePayload.funds ?? balancePayload.amount ?? 0,
    );
    if (balance > 0) return balance;
  } catch {
    // Fall back to profile.
  }

  const payload = await fiveSimRequest<Record<string, unknown>>('/user/profile');
  return normalizeFiveSimBalanceUsd(payload.balance ?? payload.total_balance ?? payload.funds ?? 0);
}

export async function ensureFiveSimMaxPrice(service: string, maxCostUsd: number) {
  const price = Number(maxCostUsd);
  if (!Number.isFinite(price) || price <= 0) return;

  const cappedPrice = Math.ceil(price * 110) / 100;
  await fiveSimRequest<Record<string, unknown>>('/user/max-prices', {
    method: 'POST',
    body: {
      product_name: service,
      price: cappedPrice,
    },
  }).catch(() => undefined);
}

export async function finishFiveSimOrder(orderId: string) {
  return fiveSimRequest<Record<string, unknown>>(
    `/user/finish/${encodeURIComponent(orderId)}`,
  );
}

export async function banFiveSimOrder(orderId: string) {
  return fiveSimRequest<Record<string, unknown>>(
    `/user/ban/${encodeURIComponent(orderId)}`,
  );
}

export async function finalizeFiveSimOrderIfCompleted(orderId: string, code: string | null) {
  if (!isValidSmsVerificationCode(code)) return;
  await finishFiveSimOrder(orderId).catch(() => undefined);
}

function resolveFiveSimExpiresAt(payload: Record<string, unknown>) {
  const expires = String(payload.expires ?? payload.expiration ?? '').trim();
  if (expires) {
    const parsed = new Date(expires);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const createdAt = String(payload.created_at ?? payload.createdAt ?? '').trim();
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getTime() + 20 * 60 * 1000).toISOString();
    }
  }

  return new Date(Date.now() + 20 * 60 * 1000).toISOString();
}

function mapFiveSimStatus(payload: Record<string, unknown>, code: string | null): FiveSimCheckResult['status'] {
  const status = String(payload.status ?? '').trim().toUpperCase();
  if (code) return 'completed';
  if (status === 'TIMEOUT') return 'expired';
  if (status === 'CANCELED' || status === 'CANCELLED' || status === 'BANNED') return 'cancelled';
  return 'pending';
}

function extractFiveSimSms(payload: Record<string, unknown>) {
  const smsRows = Array.isArray(payload.sms) ? payload.sms : [];
  const latest = smsRows.length
    ? smsRows[smsRows.length - 1] as Record<string, unknown>
    : null;

  const message = String(
    latest?.text ?? latest?.sms ?? payload.text ?? payload.message ?? '',
  ).trim();
  const code = normalizeSmsVerificationCode(
    latest?.code ?? latest?.activation_code ?? payload.code,
    message || undefined,
  );

  return { code: code || null, message: message || null };
}

export async function purchaseFiveSimNumber(
  country: string,
  service: string,
  operator = 'any',
) {
  const payload = await fiveSimRequest<Record<string, unknown>>(
    `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(service)}`,
  );

  const orderId = String(payload.id ?? payload.order_id ?? '').trim();
  const phoneNumber = String(payload.phone ?? payload.number ?? '').trim();
  if (!orderId || !phoneNumber) {
    throw new Error('5sim did not return an order ID or phone number.');
  }

  return {
    orderId,
    phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/^\+/, '')}`,
    costUsd: normalizeFiveSimPriceUsd(payload.price ?? payload.cost),
    expiresAt: resolveFiveSimExpiresAt(payload),
    raw: payload,
  } satisfies FiveSimPurchaseResult;
}

export async function checkFiveSimOrder(orderId: string): Promise<FiveSimCheckResult> {
  const payload = await fiveSimRequest<Record<string, unknown>>(
    `/user/check/${encodeURIComponent(orderId)}`,
  );
  const { code, message } = extractFiveSimSms(payload);
  const status = mapFiveSimStatus(payload, code);
  const expiresAt = resolveFiveSimExpiresAt(payload);
  const expiresMs = new Date(expiresAt).getTime() - Date.now();
  const timeLeftSeconds = Number.isFinite(expiresMs) && expiresMs > 0
    ? Math.floor(expiresMs / 1000)
    : null;

  return {
    status,
    code,
    message,
    timeLeftSeconds,
    providerRefunded: status === 'expired' || status === 'cancelled',
    raw: payload,
  };
}

export async function cancelFiveSimOrder(orderId: string) {
  return fiveSimRequest<Record<string, unknown>>(
    `/user/cancel/${encodeURIComponent(orderId)}`,
  );
}

export async function fetchFiveSimOrderHistory() {
  const payload = await fiveSimRequest<Record<string, unknown> | Record<string, unknown>[]>(
    '/user/orders?category=activation&limit=50',
  );

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { Data?: unknown }).Data)
      ? (payload as { Data: Record<string, unknown>[] }).Data
      : Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: Record<string, unknown>[] }).data
        : Array.isArray((payload as { orders?: unknown }).orders)
          ? (payload as { orders: Record<string, unknown>[] }).orders
          : payload && typeof payload === 'object'
            ? Object.values(payload).filter((row) => row && typeof row === 'object') as Record<string, unknown>[]
            : [];

  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    const { code } = extractFiveSimSms(record);
    return {
      orderId: String(record.id ?? record.order_id ?? '').trim(),
      phoneNumber: String(record.phone ?? record.number ?? '').trim() || null,
      service: String(record.product ?? record.service ?? '').trim() || null,
      countryCode: String(record.country ?? record.country_code ?? '').trim() || null,
      status: String(record.status ?? '').trim() || null,
      code,
      costUsd: normalizeFiveSimPriceUsd(record.price ?? record.cost) || null,
      createdAt: String(record.created_at ?? record.createdAt ?? '').trim() || null,
      raw: record,
    };
  }).filter((row) => row.orderId);
}

export function isValidFiveSimVerificationCode(code: unknown) {
  return isValidSmsVerificationCode(code);
}
