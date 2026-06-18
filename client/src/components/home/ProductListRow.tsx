import { useState } from 'react';
import { PlatformIcon } from '@/components/common/PlatformIcon';
import { ProductVariantsModal } from '@/components/home/ProductVariantsModal';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductListRowProps {
  product: Product;
}

export function ProductListRow({ product }: ProductListRowProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="transition-colors hover:bg-gray-50 dark:bg-dm-product-row dark:hover:bg-dm-product-row-hover">
        <div className="flex items-start gap-3 sm:gap-4 py-5 px-4 sm:px-5">
          <PlatformIcon platform={product.platform} size="sm" className="mt-0.5" />
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase leading-snug">
              {product.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
              {product.description}
            </p>
            <p className="text-[#1b5e20] text-sm font-medium mt-2">
              Starting from {formatPrice(product.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 self-end text-sm font-medium text-[#f26522] hover:underline pb-0.5"
          >
            View Products
          </button>
        </div>
        <div className="h-0.5 w-full bg-gray-300 dark:bg-dm-border" aria-hidden="true" />
      </div>

      <ProductVariantsModal
        product={product}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
