import type { Product } from '@/types';
import { parseProductDetailLines } from '@/lib/product-details';

/** Inventory placeholder — one line per stock unit; not shown to buyers. */
export const TELEGRAM_MANUAL_FULFILLMENT_MARKER = 'TELEGRAM_MANUAL_FULFILLMENT';

export function isTelegramProduct(
  product:
    | (Pick<Product, 'slug' | 'title' | 'niche'> & {
        category?: { slug?: string | null } | null;
      })
    | null
    | undefined,
): boolean {
  if (!product) return false;
  if (product.category?.slug === 'telegram') return true;
  if (product.niche?.trim().toLowerCase() === 'telegram') return true;
  if (product.title?.toUpperCase().includes('TELEGRAM')) return true;
  return false;
}

export function isTelegramFormProduct(input: {
  slug?: string | null;
  title?: string | null;
  niche?: string | null;
  categorySlug?: string | null;
}): boolean {
  if (input.categorySlug === 'telegram') return true;
  if (input.niche?.trim().toLowerCase() === 'telegram') return true;
  if (input.slug?.includes('telegram')) return true;
  if (input.title?.toUpperCase().includes('TELEGRAM')) return true;
  return false;
}

export function buildTelegramPlaceholderInventory(stock = 100): string {
  return Array.from({ length: stock }, () => TELEGRAM_MANUAL_FULFILLMENT_MARKER).join('\n');
}

export function isTelegramPlaceholderInventory(value: string | null | undefined): boolean {
  const lines = parseProductDetailLines(value);
  if (lines.length === 0) return false;
  return lines.every((line) => line.trim() === TELEGRAM_MANUAL_FULFILLMENT_MARKER);
}

export function isTelegramPendingDelivery(deliveredDetails?: string | null): boolean {
  const trimmed = deliveredDetails?.trim();
  if (!trimmed) return true;
  return trimmed === TELEGRAM_MANUAL_FULFILLMENT_MARKER;
}

/** Shown in Product Details / My Purchases — buyers receive credentials on Telegram, not in-app. */
export const TELEGRAM_BUYER_DETAILS_MESSAGE =
  'Copy your Order ID from My Purchases, then click the Telegram floating button on the marketplace to contact support with your Order ID and receive your order.';

export function getTelegramPendingDetailsMessage(): string {
  return TELEGRAM_BUYER_DETAILS_MESSAGE;
}

export const TELEGRAM_PRE_PURCHASE_INSTRUCTIONS = TELEGRAM_BUYER_DETAILS_MESSAGE;
