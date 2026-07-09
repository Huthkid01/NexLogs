import { X } from 'lucide-react';
import { useModalLock } from '@/hooks/useModalLock';
import { ProductIcon } from '@/components/common/ProductIcon';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { isTelegramProduct, TELEGRAM_PRE_PURCHASE_INSTRUCTIONS } from '@/lib/telegram-utils';
import type { Product } from '@/types';

interface ProductInstructionsModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onViewProducts?: () => void;
}

export function ProductInstructionsModal({
  product,
  open,
  onClose,
  onViewProducts,
}: ProductInstructionsModalProps) {
  const { formatProductPrice } = useFormatDisplayPrice();

  useModalLock(open, onClose);

  if (!open || !product) return null;

  const instructions = product.login_instructions?.trim();
  const isTelegram = isTelegramProduct(product);
  const displayInstructions = isTelegram
    ? instructions || TELEGRAM_PRE_PURCHASE_INSTRUCTIONS
    : instructions;
  const hasInstructions = Boolean(displayInstructions);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-instructions-title"
        className="relative flex w-full max-w-2xl max-h-modal flex-col overflow-hidden bg-white dark:bg-dm-surface rounded-xl shadow-xl"
      >
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-dm-border">
          <div className="flex min-w-0 items-start gap-3">
            <ProductIcon product={product} size="sm" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h2
                id="product-instructions-title"
                className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug break-words"
              >
                {product.title}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#1b5e20]">
                {formatProductPrice(product.price)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-0.5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm text-gray-800 dark:text-gray-200">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              About this product
            </h3>
            <LinkifiedText
              text={product.description}
              className="leading-relaxed break-words whitespace-pre-wrap"
              as="p"
            />
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              {isTelegram ? 'How to receive your order' : 'Login instructions'}
            </h3>
            {hasInstructions ? (
              <div className="rounded-lg border border-gray-200 dark:border-dm-border bg-gray-50 dark:bg-dm-product-row p-4">
              <LinkifiedText
                text={displayInstructions ?? ''}
                className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                as="div"
              />
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                Login instructions for this product have not been added yet. After purchase, your account details
                will appear in My Purchases.
              </p>
            )}
          </section>
        </div>

        <div className="shrink-0 flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-dm-border">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium bg-gray-200 dark:bg-dm-border text-gray-800 dark:text-gray-200 px-5 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          {onViewProducts ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewProducts();
              }}
              className="text-sm font-medium bg-[#f26522] text-white px-5 py-2 rounded-md hover:bg-[#d94e0f] transition-colors"
            >
              View Products
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
