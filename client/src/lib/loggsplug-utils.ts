import type { Product } from '@/types';

const LOGGSPLUG_ASSET_HOST_PATTERN = /loggsplug\.(online|com)/i;
const LOGGSPLUG_PRODUCT_IMAGE_PATH = /loggsplug\.(online|com)\/assets\/images\/product\//i;

export function isLoggsplugProduct(
  product: Pick<Product, 'supplier' | 'supplier_product_id'> | null | undefined,
): boolean {
  if (!product) return false;
  return product.supplier === 'loggsplug' && product.supplier_product_id != null;
}

export function isLoggsplugHostedAssetUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  return LOGGSPLUG_ASSET_HOST_PATTERN.test(trimmed);
}

/** Image filename or full URL — must never be shown as product description text. */
export function isLoggsplugProductImageUrl(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (LOGGSPLUG_PRODUCT_IMAGE_PATH.test(trimmed)) return true;
  if (/^https?:\/\/\S+\/assets\/images\/product\/[a-z0-9]+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(trimmed)) {
    return true;
  }
  return /^[a-f0-9]{16,}\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed);
}

export function sanitizeLoggsplugDescriptionText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || isLoggsplugProductImageUrl(trimmed)) return '';
  if (/^https?:\/\/\S+$/i.test(trimmed) && isLoggsplugHostedAssetUrl(trimmed)) return '';
  return trimmed;
}

export function buildLoggsplugProductIconUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `https://loggsplug.online${trimmed}`;

  return `https://loggsplug.online/assets/images/product/${trimmed.replace(/^\/+/, '')}`;
}

export function getLoggsplugProductIconUrl(
  product: {
    supplier?: string | null;
    supplier_product_id?: number | null;
    product_images?: { image_url: string; sort_order?: number }[] | null;
    preview_url?: string | null;
  } | null | undefined,
): string | null {
  if (!product || !isLoggsplugProduct(product)) return null;

  const storedImage =
    product.product_images?.find((image) => image.sort_order === 0) ?? product.product_images?.[0];
  const fromImageRow = buildLoggsplugProductIconUrl(storedImage?.image_url);
  if (fromImageRow && (isLoggsplugProductImageUrl(fromImageRow) || isLoggsplugHostedAssetUrl(fromImageRow))) {
    return fromImageRow;
  }

  const fromPreview = buildLoggsplugProductIconUrl(product.preview_url);
  if (fromPreview && (isLoggsplugProductImageUrl(fromPreview) || isLoggsplugHostedAssetUrl(fromPreview))) {
    return fromPreview;
  }

  return null;
}
