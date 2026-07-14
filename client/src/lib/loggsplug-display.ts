import { isLoggsplugProduct, sanitizeLoggsplugDescriptionText } from '@/lib/loggsplug-utils';
import type { Product } from '@/types';

function isLoggsplugInstructionalText(value: string): boolean {
  if (sanitizeLoggsplugDescriptionText(value) !== value.trim()) return false;
  return /login|log in|password|username|email|telegram|t\.me|https?:\/\/|step|how to|log format|format:|credentials|proxy|channel|cookie/i.test(value);
}

function isGenericLoggsplugFallbackInstruction(value: string): boolean {
  return /after purchase, open my purchases/i.test(value);
}

function isWeakLoggsplugStorefrontDescription(
  value: string,
  title: string,
  niche: string,
): boolean {
  const text = value.trim();
  if (!text) return true;
  if (text === title.trim()) return true;
  if (niche && (text === `${title.trim()} — ${niche.trim()}` || text === `${title.trim()} - ${niche.trim()}`)) {
    return true;
  }
  if (isGenericLoggsplugFallbackInstruction(text)) return true;
  return false;
}

function pickRichestLoggsplugText(candidates: string[]): string {
  if (!candidates.length) return '';
  const instructional = candidates.filter(isLoggsplugInstructionalText);
  const pool = instructional.length ? instructional : candidates;
  return pool.reduce((best, current) => (current.length >= best.length ? current : best));
}

export function getLoggsplugDisplayDescription(
  product: Pick<
    Product,
    'description' | 'login_instructions' | 'title' | 'niche' | 'supplier' | 'supplier_product_id'
  > | null | undefined,
): string {
  if (!product) return '';

  if (!isLoggsplugProduct(product)) {
    return product.description?.trim() ?? '';
  }

  const title = product.title?.trim() ?? '';
  const niche = product.niche?.trim() ?? '';
  const description = sanitizeLoggsplugDescriptionText(product.description);
  const instructions = sanitizeLoggsplugDescriptionText(product.login_instructions);

  const candidates = [description, instructions].filter(
    (value): value is string =>
      Boolean(value) && !isWeakLoggsplugStorefrontDescription(value, title, niche),
  );

  const best = pickRichestLoggsplugText(candidates);
  if (best) return best;

  if (description) return description;
  if (title && niche && !title.toLowerCase().includes(niche.toLowerCase())) {
    return `${title} — ${niche}`;
  }
  return title;
}

export function getLoggsplugPrePurchaseInstructions(
  product: Pick<Product, 'description' | 'login_instructions' | 'supplier' | 'supplier_product_id' | 'title' | 'niche'> | null | undefined,
): string {
  if (!product || !isLoggsplugProduct(product)) return '';

  // Same rich LOGGSPLUG copy as the description panel (DESCRIPTION / LOG FORMAT / links).
  const display = getLoggsplugDisplayDescription(product);
  if (display && isLoggsplugInstructionalText(display)) {
    return display;
  }

  const instructions = sanitizeLoggsplugDescriptionText(product.login_instructions);
  if (instructions && !isGenericLoggsplugFallbackInstruction(instructions)) {
    return instructions;
  }

  return '';
}

export function getLoggsplugInstructionsHeading(
  product: Pick<Product, 'description' | 'login_instructions' | 'supplier' | 'supplier_product_id' | 'title' | 'niche'> | null | undefined,
): string {
  const text = getLoggsplugPrePurchaseInstructions(product);
  if (/telegram|proxy|how to use/i.test(text)) {
    return 'How to use this product';
  }
  return 'Login instructions';
}

export function shouldShowLoggsplugInstructionsSection(
  product: Pick<Product, 'description' | 'login_instructions' | 'title' | 'niche' | 'supplier' | 'supplier_product_id'> | null | undefined,
): boolean {
  const instructions = getLoggsplugPrePurchaseInstructions(product);
  if (!instructions) return false;

  const description = getLoggsplugDisplayDescription(product);
  return !description || instructions !== description;
}
