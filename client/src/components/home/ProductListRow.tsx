import { useState } from 'react';
import { ProductIcon } from '@/components/common/ProductIcon';
import { ProductVariantsModal } from '@/components/home/ProductVariantsModal';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import type { Product } from '@/types';

interface ProductListRowProps {
  product: Product;
}

export function ProductListRow({ product }: ProductListRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { formatProductPrice } = useFormatDisplayPrice();

  return (
    <>
      <div className="transition-colors hover:bg-gray-50 dark:bg-dm-product-row dark:hover:bg-dm-product-row-hover">
        <div className="px-4 py-5 sm:px-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <ProductIcon product={product} size="sm" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold leading-snug break-words text-gray-900 dark:text-gray-100">
                {product.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed break-words text-gray-500 dark:text-gray-400 sm:line-clamp-2">
                {product.description}
              </p>
              <p className="mt-2 text-sm font-medium text-[#1b5e20]">
                Starting from {formatProductPrice(product.price)}
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-3 text-sm font-medium text-[#f26522] hover:underline sm:hidden"
              >
                View Products
              </button>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hidden shrink-0 self-end pb-0.5 text-sm font-medium text-[#f26522] hover:underline sm:block"
            >
              View Products
            </button>
          </div>
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
