import type { Product } from '@/types';
import { getLoggsplugDisplayDescription } from '@/lib/loggsplug-display';
import { isLoggsplugProduct, sanitizeLoggsplugDescriptionText } from '@/lib/loggsplug-utils';

/** Catalog line under the title on mobile list rows (image 1 style). */
export function formatProductListSubtitle(
  product: Pick<Product, 'slug' | 'description' | 'title' | 'login_instructions' | 'niche' | 'supplier' | 'supplier_product_id'>,
): string {
  const title = product.title?.trim() ?? '';
  const description = isLoggsplugProduct(product)
    ? getLoggsplugDisplayDescription(product)
    : product.description?.trim();
  const niche = product.niche?.trim();

  if (description) {
    const normalized = description.replace(/\|/g, ' • ').trim();
    const singleLinePreview = normalized.replace(/\n+/g, ' • ');

    if (normalized !== title) {
      return singleLinePreview;
    }

    if (niche && !normalized.toLowerCase().includes(niche.toLowerCase())) {
      return `${singleLinePreview} • ${niche}`;
    }

    return singleLinePreview;
  }

  if (niche && niche !== title) {
    return niche;
  }

  const instructions = product.login_instructions?.trim();
  if (instructions) {
    const sanitized = sanitizeLoggsplugDescriptionText(instructions);
    if (sanitized) {
      const singleLine = sanitized.replace(/\s+/g, ' ').trim();
      return singleLine.length > 140 ? `${singleLine.slice(0, 137)}...` : singleLine;
    }
  }

  if (isLoggsplugProduct(product) && description) {
    const singleLine = description.replace(/\s+/g, ' ').trim();
    if (singleLine !== title) {
      return singleLine.length > 140 ? `${singleLine.slice(0, 137)}...` : singleLine;
    }
  }

  if (isLoggsplugProduct(product) && niche && niche !== title) {
    return niche;
  }

  const slug = product.slug?.trim();
  if (!slug) return '';

  return slug.replace(/-/g, ' ');
}
