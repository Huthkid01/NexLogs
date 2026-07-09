import type { Product } from '@/types';

/** Catalog line under the title on mobile list rows (image 1 style). */
export function formatProductListSubtitle(product: Pick<Product, 'slug' | 'description'>): string {
  const description = product.description?.trim();
  if (description) {
    return description
      .replace(/\|/g, ' • ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const slug = product.slug?.trim();
  if (!slug) return '';

  return slug.replace(/-/g, ' ');
}
