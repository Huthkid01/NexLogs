import type { Product } from '@/types';

export interface ProductVariant {
  id: string;
  product_id: string;
  description: string;
  price: number;
}

export function getProductVariants(product: Product): ProductVariant[] {
  const count = Math.max(product.stock, 1);

  return Array.from({ length: count }, (_, index) => ({
    id: `${product.id}-variant-${index + 1}`,
    product_id: product.id,
    description: product.description,
    price: product.price,
  }));
}
