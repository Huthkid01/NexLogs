const DEFAULT_BASE_URL = 'https://loggsplug.online/api/reseller';
const PUBLIC_API_BASE = 'https://loggsplug.online/api';

export interface LoggsplugProductRow {
  id: number;
  name: string;
  category: string;
  base_price: number;
  reseller_price: number;
  in_stock: number;
  description?: string | null;
  production_description?: string | null;
  product_description?: string | null;
  details?: string | null;
  short_description?: string | null;
  about?: string | null;
  long_description?: string | null;
  image?: string | null;
  image_url?: string | null;
  icon?: string | null;
  thumbnail?: string | null;
  product_image?: string | null;
  img?: string | null;
  images?: string[] | null;
}

export interface LoggsplugProfile {
  username: string;
  email: string;
  balance: number;
  business_name: string | null;
  admin_discount_percent: number | null;
}

export interface LoggsplugDeliveredItem {
  id: number;
  details: string;
}

export interface LoggsplugOrderResponse {
  success: boolean;
  message?: string;
  order_id?: number;
  charged?: number;
  delivered?: LoggsplugDeliveredItem[];
  code?: string;
  error?: string;
}

function getApiKey() {
  const apiKey = Deno.env.get('LOGGSPLUG_API_KEY')?.trim();
  if (!apiKey) {
    throw new Error('LOGGSPLUG_API_KEY is not set in Supabase Edge Function secrets.');
  }
  return apiKey;
}

function getBaseUrl() {
  return (Deno.env.get('LOGGSPLUG_API_BASE') || DEFAULT_BASE_URL).replace(/\/$/, '');
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const record = payload as Record<string, unknown>;
    const message =
      (typeof record.message === 'string' && record.message)
      || (typeof record.error === 'string' && record.error)
      || `LOGGSPLUG request failed (${response.status})`;
    const code = typeof record.code === 'string' ? record.code : undefined;
    const error = new Error(message) as Error & { code?: string };
    if (code) error.code = code;
    throw error;
  }
  return payload as T;
}

function authHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
}

const DETAIL_FETCH_CONCURRENCY = 2;
const DETAIL_FETCH_RETRIES = 3;
const DETAIL_PREFIX_MAX_CHARS = 200_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

export async function fetchLoggsplugProducts(): Promise<LoggsplugProductRow[]> {
  const apiKey = getApiKey();
  const response = await fetch(`${getBaseUrl()}/products`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });

  const payload = await parseJsonResponse<{ success?: boolean; data?: LoggsplugProductRow[] }>(response);
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function hydrateLoggsplugProducts(
  products: LoggsplugProductRow[],
): Promise<LoggsplugProductRow[]> {
  return mapWithConcurrency(products, DETAIL_FETCH_CONCURRENCY, enrichLoggsplugProduct);
}

async function enrichLoggsplugProduct(product: LoggsplugProductRow): Promise<LoggsplugProductRow> {
  const detail = await fetchLoggsplugProductDetail(product.id);
  const merged: LoggsplugProductRow = { ...product };

  if (typeof detail.description === 'string' && detail.description.trim()) {
    merged.description = detail.description;
  }
  if (typeof detail.image === 'string' && detail.image.trim()) {
    merged.image = detail.image;
  }
  if (detail.in_stock != null && Number.isFinite(Number(detail.in_stock))) {
    merged.in_stock = Number(detail.in_stock);
  }
  if (typeof detail.category === 'string' && detail.category.trim()) {
    merged.category = detail.category;
  }

  return merged;
}

export async function fetchLoggsplugProductDetail(productId: number): Promise<Partial<LoggsplugProductRow>> {
  const publicDetail = await fetchLoggsplugPublicProductDetail(productId);
  if (Object.keys(publicDetail).length > 0) {
    return publicDetail;
  }

  const apiKey = getApiKey();
  const paths = [
    `/products/${productId}`,
    `/product/${productId}`,
    `/product/details/${productId}`,
    `/products/details/${productId}`,
  ];

  for (const path of paths) {
    try {
      const response = await fetch(`${getBaseUrl()}${path}`, {
        method: 'GET',
        headers: authHeaders(apiKey),
      });
      if (!response.ok) continue;

      const payload = await parseJsonResponse<Record<string, unknown>>(response);
      const detail = unwrapLoggsplugDetailPayload(payload);
      if (detail && typeof detail === 'object' && Object.keys(detail).length > 0) {
        return detail as Partial<LoggsplugProductRow>;
      }
    } catch {
      continue;
    }
  }

  return {};
}

function stripProductDetailsFromJson(raw: string): string {
  const marker = '"product_details"';
  const idx = raw.indexOf(marker);
  if (idx === -1) return raw;

  const arrayStart = raw.indexOf('[', idx);
  if (arrayStart === -1) return raw;

  let depth = 0;
  for (let i = arrayStart; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return `${raw.slice(0, arrayStart)}[]${raw.slice(i + 1)}`;
      }
    }
  }

  return raw;
}

function extractJsonStringField(raw: string, key: string, fromIndex = 0): string | undefined {
  const keyMarker = `"${key}"`;
  const keyIdx = raw.indexOf(keyMarker, fromIndex);
  if (keyIdx === -1) return undefined;

  let i = keyIdx + keyMarker.length;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
  if (raw[i] !== ':') return undefined;
  i += 1;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
  if (raw[i] !== '"') return undefined;
  i += 1;

  let out = '';
  while (i < raw.length) {
    const ch = raw[i]!;
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next == null) return undefined;
      if (next === 'u' && i + 5 < raw.length) {
        const hex = raw.slice(i + 2, i + 6);
        const code = Number.parseInt(hex, 16);
        out += Number.isFinite(code) ? String.fromCharCode(code) : '';
        i += 6;
        continue;
      }
      const escaped: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        '"': '"',
        '\\': '\\',
        '/': '/',
      };
      out += escaped[next] ?? next;
      i += 2;
      continue;
    }
    if (ch === '"') return out;
    out += ch;
    i += 1;
  }

  // Truncated mid-string — not usable yet.
  return undefined;
}

function extractJsonNumberField(raw: string, key: string, fromIndex = 0): number | undefined {
  const keyMarker = `"${key}"`;
  const keyIdx = raw.indexOf(keyMarker, fromIndex);
  if (keyIdx === -1) return undefined;

  let i = keyIdx + keyMarker.length;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
  if (raw[i] !== ':') return undefined;
  i += 1;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;

  const match = raw.slice(i).match(/^-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

function extractPublicProductFields(raw: string): Partial<LoggsplugProductRow> {
  const productIdx = Math.max(0, raw.indexOf('"product"'));
  const description = extractJsonStringField(raw, 'description', productIdx);
  const image = extractJsonStringField(raw, 'image', productIdx);
  const inStock = extractJsonNumberField(raw, 'in_stock', productIdx);

  let categoryName: string | undefined;
  const categoryIdx = raw.indexOf('"category"', productIdx);
  if (categoryIdx >= 0) {
    categoryName = extractJsonStringField(raw, 'name', categoryIdx);
  }

  const result: Partial<LoggsplugProductRow> = {};
  if (description?.trim()) result.description = description;
  if (image?.trim()) result.image = image;
  if (inStock != null) result.in_stock = inStock;
  if (categoryName?.trim()) result.category = categoryName;
  return result;
}

function hasCompletePublicPrefix(raw: string): boolean {
  // description always appears before product_details on LOGGSPLUG's public payload.
  if (!raw.includes('"product_details"')) return false;
  return extractJsonStringField(raw, 'description', Math.max(0, raw.indexOf('"product"'))) != null;
}

async function readPublicProductPrefix(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return await response.text();
  }

  const decoder = new TextDecoder();
  let raw = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });

      if (hasCompletePublicPrefix(raw) || raw.length >= DETAIL_PREFIX_MAX_CHARS) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
    raw += decoder.decode();
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  return raw;
}

export async function fetchLoggsplugPublicProductDetail(
  productId: number,
): Promise<Partial<LoggsplugProductRow>> {
  for (let attempt = 0; attempt <= DETAIL_FETCH_RETRIES; attempt += 1) {
    const detail = await fetchLoggsplugPublicProductDetailOnce(productId);
    if (Object.keys(detail).length > 0) {
      return detail;
    }

    if (attempt < DETAIL_FETCH_RETRIES) {
      await sleep(400 * (attempt + 1));
    }
  }

  return {};
}

async function fetchLoggsplugPublicProductDetailOnce(
  productId: number,
): Promise<Partial<LoggsplugProductRow>> {
  try {
    const response = await fetch(`${PUBLIC_API_BASE}/products/${productId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return {};

    const raw = await readPublicProductPrefix(response);
    const extracted = extractPublicProductFields(raw);
    if (Object.keys(extracted).length > 0) {
      return extracted;
    }

    // Fallback for unusual payloads: strip inventory array then parse.
    const sanitized = stripProductDetailsFromJson(raw);
    const payload = JSON.parse(sanitized) as { product?: Record<string, unknown> };
    const product = payload.product;
    if (!product || typeof product !== 'object') return {};

    const category = product.category && typeof product.category === 'object'
      ? product.category as Record<string, unknown>
      : null;
    const categoryName = typeof category?.name === 'string' ? category.name : undefined;

    return {
      description: typeof product.description === 'string' ? product.description : undefined,
      image: typeof product.image === 'string' ? product.image : undefined,
      in_stock: product.in_stock != null ? Number(product.in_stock) : undefined,
      category: categoryName,
    };
  } catch {
    return {};
  }
}

function unwrapLoggsplugDetailPayload(payload: Record<string, unknown>): Record<string, unknown> | null {
  if (payload.data && typeof payload.data === 'object') {
    return payload.data as Record<string, unknown>;
  }
  if (payload.product && typeof payload.product === 'object') {
    return payload.product as Record<string, unknown>;
  }
  if (payload.item && typeof payload.item === 'object') {
    return payload.item as Record<string, unknown>;
  }
  if (typeof payload.id === 'number' || typeof payload.name === 'string') {
    return payload;
  }
  return null;
}

export async function fetchLoggsplugProfile(): Promise<LoggsplugProfile> {
  const apiKey = getApiKey();
  const response = await fetch(`${getBaseUrl()}/me`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });

  const payload = await parseJsonResponse<{ success?: boolean; data?: LoggsplugProfile }>(response);
  if (!payload.data) {
    throw new Error('LOGGSPLUG profile response was empty.');
  }
  return payload.data;
}

export async function placeLoggsplugOrder(productId: number, qty: number): Promise<LoggsplugOrderResponse> {
  const apiKey = getApiKey();
  const response = await fetch(`${getBaseUrl()}/order`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      api_key: apiKey,
      product_id: productId,
      qty,
    }),
  });

  return parseJsonResponse<LoggsplugOrderResponse>(response);
}

export function calculateRetailPriceNgn(costNgn: number, markupPercent: number) {
  const safeCost = Number.isFinite(costNgn) ? costNgn : 0;
  const safeMarkup = Number.isFinite(markupPercent) ? markupPercent : 0;
  return Math.max(Math.round(safeCost * (1 + safeMarkup / 100)), 0);
}

export function calculateProfitNgn(costNgn: number, markupPercent: number) {
  const retail = calculateRetailPriceNgn(costNgn, markupPercent);
  return Math.max(retail - costNgn, 0);
}

export function slugifyLoggsplugProduct(name: string, productId: number) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${base || 'account'}-${productId}`;
}

const LOGGSPLUG_ASSET_HOSTS = [
  'https://loggsplug.online',
  'https://www.loggsplug.online',
  'https://loggsplug.com',
  'https://www.loggsplug.com',
];

export function resolveLoggsplugProductIconUrl(product: LoggsplugProductRow): string | null {
  const record = product as LoggsplugProductRow & Record<string, unknown>;
  const imageList = Array.isArray(record.images) ? record.images : [];
  const candidates = [
    ...imageList,
    record.image_url,
    record.image,
    record.icon,
    record.thumbnail,
    record.product_image,
    record.img,
    record.photo,
    record.picture,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = normalizeLoggsplugAssetUrl(candidate);
    if (normalized) return normalized;
  }

  return null;
}

export function isWeakLoggsplugDescription(
  description: string,
  name: string,
  category: string,
): boolean {
  const text = description.trim();
  const title = name.trim();
  const niche = category.trim();

  if (!text) return true;
  if (text === title) return true;
  if (niche && (text === `${title} — ${niche}` || text === `${title} - ${niche}`)) return true;
  if (isLoggsplugProductImageUrl(text)) return true;
  if (/^https?:\/\/\S+$/i.test(text) && /loggsplug\.(online|com)/i.test(text)) return true;

  // Short placeholders without login/usage guidance should be refreshed from LOGGSPLUG.
  const looksInstructional = /log format|password|username|telegram|t\.me|how to|2fa|cookie|vpn/i.test(text);
  if (text.length < 50 && !looksInstructional) return true;

  return false;
}

export function shouldRefreshLoggsplugDescription(product: LoggsplugProductRow): boolean {
  const description = resolveLoggsplugProductDescription(product);
  return isWeakLoggsplugDescription(description, product.name || '', product.category || '');
}

export function resolveLoggsplugProductDescription(product: LoggsplugProductRow): string {
  const record = product as LoggsplugProductRow & Record<string, unknown>;
  const description = extractLoggsplugDescription(record);
  const name = product.name?.trim() ?? '';
  const category = product.category?.trim() ?? '';

  if (description && description !== name) {
    return description;
  }

  if (name && category && !name.toLowerCase().includes(category.toLowerCase())) {
    return `${name} — ${category}`;
  }

  return buildLoggsplugProductDescription(name, category);
}

export function resolveLoggsplugLoginInstructions(product: LoggsplugProductRow): string {
  const record = product as LoggsplugProductRow & Record<string, unknown>;
  const explicit = extractLoggsplugLoginInstructions(record);
  if (explicit) return explicit;

  const description = extractLoggsplugDescription(record);
  if (description && isLoggsplugInstructionalText(description)) {
    return description;
  }

  return buildLoggsplugDefaultLoginInstructions(product.name, product.category);
}

function extractLoggsplugLoginInstructions(record: Record<string, unknown>): string {
  const nested = record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : null;
  const product = record.product && typeof record.product === 'object'
    ? record.product as Record<string, unknown>
    : null;

  const candidates = [
    record.login_instructions,
    record.how_to_use,
    record.usage_instructions,
    record.usage,
    record.guide,
    record.instructions,
    record.how_to_login,
    nested?.login_instructions,
    nested?.how_to_use,
    nested?.instructions,
    product?.login_instructions,
    product?.how_to_use,
    product?.instructions,
  ];

  for (const candidate of candidates) {
    const normalized = acceptLoggsplugDescriptionCandidate(
      typeof candidate === 'string' ? candidate : '',
    );
    if (normalized) return normalized;
  }

  return '';
}

function isLoggsplugInstructionalText(value: string): boolean {
  if (isLoggsplugProductImageUrl(value)) return false;
  return /login|log in|password|username|email|telegram|t\.me|https?:\/\/|step|how to|log format|format:|credentials|proxy|channel|cookie/i.test(value);
}

function buildLoggsplugDefaultLoginInstructions(name: string, category: string): string {
  const label = `${name} ${category}`.toLowerCase();
  if (/proxy|tool|tutorial|guide|vpn/.test(label)) {
    return 'After purchase, open My Purchases to view your order details and follow any links or steps included with your delivery.';
  }

  return 'After purchase, open My Purchases to copy your account credentials (username or email and password), then log in to the platform.';
}

function extractLoggsplugDescription(record: Record<string, unknown>): string {
  const nested = record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : null;
  const product = record.product && typeof record.product === 'object'
    ? record.product as Record<string, unknown>
    : null;

  const candidates = [
    record.production_description,
    record.description,
    record.product_description,
    record.details,
    record.short_description,
    record.about,
    record.long_description,
    record.desc,
    record.body,
    record.content,
    record.summary,
    record.information,
    nested?.production_description,
    nested?.description,
    nested?.product_description,
    nested?.details,
    nested?.short_description,
    nested?.about,
    nested?.long_description,
    product?.production_description,
    product?.description,
    product?.product_description,
    product?.details,
  ];

  for (const candidate of candidates) {
    const normalized = acceptLoggsplugDescriptionCandidate(
      typeof candidate === 'string' ? candidate : '',
    );
    if (normalized) return normalized;
  }

  return findRichTextDescription(record);
}

function findRichTextDescription(record: Record<string, unknown>): string {
  const excludeName = typeof record.name === 'string' ? record.name.trim().toLowerCase() : '';
  const found: string[] = [];

  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      const normalized = acceptLoggsplugDescriptionCandidate(value);
      if (!normalized) return;
      if (excludeName && normalized.toLowerCase() === excludeName) return;
      if (isLoggsplugInstructionalText(normalized) || normalized.length > 40) {
        found.push(normalized);
      }
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        if (/detail|credential|inventory|stock|sold|image|icon|thumbnail|photo|picture|img|url/i.test(key)) {
          return;
        }
        walk(nested);
      });
    }
  };

  walk(record);
  return found.sort((a, b) => b.length - a.length)[0] ?? '';
}

function isLoggsplugProductImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/loggsplug\.(online|com)\/assets\/images\/product\//i.test(trimmed)) return true;
  if (/^https?:\/\/\S+\/assets\/images\/product\/[a-z0-9]+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(trimmed)) {
    return true;
  }
  return /^[a-f0-9]{16,}\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed);
}

function acceptLoggsplugDescriptionCandidate(value: string): string {
  const normalized = normalizeLoggsplugDescriptionValue(value);
  if (!normalized || isLoggsplugProductImageUrl(normalized)) return '';
  if (/^https?:\/\/\S+$/i.test(normalized) && /loggsplug\.(online|com)/i.test(normalized)) return '';
  return normalized;
}

function normalizeLoggsplugDescriptionValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  const stripped = stripHtml(value);
  return stripped
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function stripHtml(value: string): string {
  let html = value
    .replace(/\r\n?/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // Keep link label + URL so the storefront can render clickable captions like LOGGSPLUG.
  html = html.replace(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (label && label !== href && !/^https?:\/\//i.test(label)) {
        return `\n${label}\n${href}\n`;
      }
      return `\n${href}\n`;
    },
  );

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|ul|ol)>/gi, '\n')
    .replace(/<(strong|b|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeLoggsplugAssetUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${LOGGSPLUG_ASSET_HOSTS[0]}${trimmed}`;
  }

  return `${LOGGSPLUG_ASSET_HOSTS[0]}/assets/images/product/${trimmed.replace(/^\/+/, '')}`;
}

export function buildLoggsplugProductDescription(name: string, category: string) {
  const title = name.trim();
  if (title) return title;

  const label = category.trim();
  if (label) return `${label} account`;

  return 'Digital account';
}

export function mapLoggsplugCategoryToPlatform(category: string):
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'x'
  | 'youtube'
  | 'snapchat' {
  const normalized = category.toLowerCase();
  if (normalized.includes('instagram') || normalized.includes('ig')) return 'instagram';
  if (normalized.includes('facebook') || normalized.includes('fb')) return 'facebook';
  if (normalized.includes('tiktok')) return 'tiktok';
  if (normalized.includes('twitter') || normalized === 'x' || normalized.includes('x ')) return 'x';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('snap')) return 'snapchat';
  if (normalized.includes('telegram')) return 'snapchat';
  if (normalized.includes('tool') || normalized.includes('tutorial') || normalized.includes('guide')) {
    return 'youtube';
  }
  if (normalized.includes('account')) return 'instagram';
  return 'snapchat';
}

export function mapLoggsplugCategoryToSlug(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes('instagram')) return 'instagram';
  if (normalized.includes('facebook')) return 'facebook';
  if (normalized.includes('tiktok')) return 'tiktok';
  if (normalized.includes('twitter') || normalized === 'x') return 'x-twitter';
  if (normalized.includes('snap')) return 'snapchat';
  if (normalized.includes('telegram')) return 'telegram';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('tool')) return 'tools';
  if (normalized.includes('tutorial') || normalized.includes('guide')) return 'tutorials';
  if (normalized.includes('account')) return 'accounts';

  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'digital-products';
}

export function formatDeliveredDetails(items: LoggsplugDeliveredItem[]) {
  return items
    .map((item, index) => {
      const details = item.details?.trim() || '';
      if (!details) return '';
      if (items.length === 1) return details;
      return `Item ${index + 1}\n${details}`;
    })
    .filter(Boolean)
    .join('\n\n');
}
