import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { getProductLog } from '@/lib/account-details';
import { formatPurchaseDate } from '@/lib/purchase-utils';
import type { Product } from '@/types';

interface ProductDetailsModalProps {
  product: Product | null;
  orderDate: string;
  logSeed: string;
  deliveredDetails?: string | null;
  open: boolean;
  onClose: () => void;
}

export function ProductDetailsModal({
  product,
  orderDate,
  logSeed,
  deliveredDetails,
  open,
  onClose,
}: ProductDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  const logContent = product ? getProductLog(product, logSeed, deliveredDetails) : '';

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
      setCopied(false);
    };
  }, [open, onClose]);

  if (!open || !product) return null;

  const handleCopyLog = async () => {
    try {
      await navigator.clipboard.writeText(logContent);
      setCopied(true);
      toast.success('Product log copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden bg-white dark:bg-dm-surface rounded-xl shadow-xl"
      >
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <h2
            id="product-details-title"
            className="text-lg font-bold text-gray-900 dark:text-gray-100"
          >
            Product Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-0.5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4 text-sm text-gray-900 dark:text-gray-100">
          <p>
            <span className="font-bold">Name:</span>{' '}
            <span className="uppercase">{product.title}</span>
          </p>

          <p>
            <span className="font-bold">Description:</span> {product.description}
          </p>

          <p>
            <span className="font-bold">Order Date:</span> {formatPurchaseDate(orderDate)}
          </p>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-bold">Product details/Log:</span>
              <button
                type="button"
                onClick={handleCopyLog}
                className="text-xs font-medium bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="rounded border border-gray-300 dark:border-dm-border bg-white dark:bg-dm-product-row p-3 min-h-[180px] max-h-[320px] overflow-y-auto">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-sans leading-relaxed">
                {logContent}
              </pre>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex justify-end px-6 py-4 border-t border-gray-200 dark:border-dm-border">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium bg-gray-200 dark:bg-dm-border text-gray-800 dark:text-gray-200 px-5 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
