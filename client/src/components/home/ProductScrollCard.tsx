import { useState } from 'react';
import { ProductIcon } from '@/components/common/ProductIcon';
import { ProductVariantsModal } from '@/components/home/ProductVariantsModal';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import type { Product } from '@/types';

interface ProductScrollCardProps {
  product: Product;
}

export function ProductScrollCard({ product }: ProductScrollCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { formatProductPrice } = useFormatDisplayPrice();

  return (
    <>
      <article className="shrink-0 snap-start w-[280px] sm:w-[300px] rounded-xl border border-gray-200 dark:border-dm-border bg-white dark:bg-dm-surface p-4 flex flex-col transition-colors hover:bg-gray-50 dark:hover:bg-dm-product-row-hover">
        <div className="flex items-start gap-3">
          <ProductIcon product={product} size="sm" className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug break-words sm:line-clamp-3">
              {product.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed break-words sm:line-clamp-3">
              {product.description}
            </p>
          </div>
        </div>

        <p className="text-[#1b5e20] text-sm font-semibold mt-4">
          Starting from {formatProductPrice(product.price)}
        </p>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-4 w-full text-sm font-medium text-[#f26522] hover:underline text-left"
        >
          View Products
        </button>
      </article>

      <ProductVariantsModal
        product={product}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
