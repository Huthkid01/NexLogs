import type { Order, OrderItem, Product, PlatformType } from '@/types';

export function getOrderItemForDisplay(order: Pick<Order, 'order_items'>): OrderItem | null {
  const items = order.order_items ?? [];
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  return items[0] ?? null;
}

const PLATFORM_LABELS: Record<PlatformType, string> = {
  instagram: 'INSTAGRAM/threads',
  facebook: 'FACEBOOK',
  tiktok: 'TIKTOK',
  x: 'TWITTER',
  youtube: 'YOUTUBE',
  snapchat: 'SNAPCHAT',
};

export function getDisplayOrderId(orderNumber: string) {
  return orderNumber.replace(/-/g, '');
}

export function formatPurchaseDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatPurchaseAmount(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPurchasePlatformLabel(product: Product) {
  if (product.title.toUpperCase().includes('TELEGRAM') || product.niche?.toUpperCase() === 'TELEGRAM') {
    return 'TELEGRAM';
  }

  return PLATFORM_LABELS[product.platform] ?? product.platform.toUpperCase();
}
