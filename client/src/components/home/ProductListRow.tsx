import { useState, type KeyboardEvent } from 'react';
import { ProductIcon } from '@/components/common/ProductIcon';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { ProductInstructionsModal } from '@/components/home/ProductInstructionsModal';
import { ProductVariantsModal } from '@/components/home/ProductVariantsModal';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import type { Product } from '@/types';

interface ProductListRowProps {
  product: Product;
}

export function ProductListRow({ product }: ProductListRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const { formatProductPrice } = useFormatDisplayPrice();

  const openPurchaseModal = () => setModalOpen(true);
  const openInstructions = () => setInstructionsOpen(true);

  const handleInstructionsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openInstructions();
    }
  };

  return (
    <>
      <div className="transition-colors hover:bg-gray-50 dark:bg-dm-product-row dark:hover:bg-dm-product-row-hover">
        <div className="px-4 py-5 sm:px-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              role="button"
              tabIndex={0}
              onClick={openInstructions}
              onKeyDown={handleInstructionsKeyDown}
              className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4 text-left rounded-md -m-1 p-1 hover:bg-gray-100/80 dark:hover:bg-dm-surface/60 transition-colors cursor-pointer"
              aria-label={`View instructions for ${product.title}`}
            >
              <ProductIcon product={product} size="sm" className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-snug break-words text-gray-900 dark:text-gray-100">
                  {product.title}
                </h3>
                <LinkifiedText
                  text={product.description}
                  className="mt-1.5 text-xs leading-relaxed break-words text-gray-500 dark:text-gray-400 sm:line-clamp-2"
                  as="p"
                />
                <p className="mt-2 text-sm font-medium text-[#1b5e20]">
                  Starting from {formatProductPrice(product.price)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openPurchaseModal}
              className="shrink-0 self-end pb-0.5 text-sm font-medium text-[#f26522] hover:underline"
            >
              View Products
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-gray-300 dark:bg-dm-border" aria-hidden="true" />
      </div>

      <ProductInstructionsModal
        product={product}
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        onViewProducts={openPurchaseModal}
      />

      <ProductVariantsModal
        product={product}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
