import { useState } from 'react';
import { ProductIcon } from '@/components/common/ProductIcon';
import { ProductVariantsModal } from '@/components/home/ProductVariantsModal';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { formatProductListSubtitle } from '@/lib/product-list-display';
import type { Product } from '@/types';

interface ProductListRowProps {
  product: Product;
}

export function ProductListRow({ product }: ProductListRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { formatProductPrice } = useFormatDisplayPrice();
  const subtitle = formatProductListSubtitle(product);

  return (
    <>
      <div className="transition-colors hover:bg-gray-50 dark:bg-dm-product-row dark:hover:bg-dm-product-row-hover">
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start gap-3">
            <ProductIcon product={product} size="sm" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-bold uppercase leading-snug text-gray-900 dark:text-gray-100 sm:text-sm">
                {product.title}
              </h3>
              {subtitle ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 sm:text-xs line-clamp-2">
                  {subtitle}
                </p>
              ) : null}
              <div className="mt-2.5 flex items-end justify-between gap-3">
                <p className="text-sm font-medium text-[#1b5e20] leading-none">
                  Starting from {formatProductPrice(product.price)}
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="shrink-0 text-sm font-medium text-[#f26522] hover:underline leading-none pb-0.5"
                >
                  View Products
                </button>
              </div>
            </div>
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
