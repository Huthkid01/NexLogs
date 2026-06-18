import type { Product, PlatformType } from '@/types';

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
  return `$ ${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export function getPurchasePlatformLabel(product: Product) {
  if (product.title.toUpperCase().includes('TELEGRAM') || product.niche?.toUpperCase() === 'TELEGRAM') {
    return 'TELEGRAM';
  }

  return PLATFORM_LABELS[product.platform] ?? product.platform.toUpperCase();
}
