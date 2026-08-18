import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useModalLock } from '@/hooks/useModalLock';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { LoggsplugDescriptionView } from '@/components/home/LoggsplugDescriptionView';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import { getProductLog } from '@/lib/account-details';
import { formatPurchaseDate } from '@/lib/purchase-utils';
import { getLoggsplugDisplayDescription } from '@/lib/loggsplug-display';
import { isLoggsplugProduct } from '@/lib/loggsplug-utils';
import { isRdpProduct, RDP_PENDING_DETAILS_MESSAGE } from '@/lib/rdp-utils';
import { getTelegramPendingDetailsMessage, isTelegramProduct, TELEGRAM_MANUAL_FULFILLMENT_MARKER } from '@/lib/telegram-utils';
import type { Product } from '@/types';

interface ProductDetailsModalProps {
  product: Product | null;
  orderDate: string;
  logSeed: string;
  orderId?: string;
  deliveredDetails?: string | null;
  fallbackTitle?: string;
  fallbackDescription?: string;
  open: boolean;
  onClose: () => void;
  /** When set, shows a countdown that My Purchases will open after copy time. */
  redirectSecondsLeft?: number | null;
}

export function ProductDetailsModal({
  product,
  orderDate,
  logSeed,
  deliveredDetails,
  fallbackTitle,
  fallbackDescription,
  open,
  onClose,
  redirectSecondsLeft = null,
}: ProductDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  const logContent = product
    ? getProductLog(product, logSeed, deliveredDetails)
    : deliveredDetails?.trim() || 'Product details are available only in this order record.';
  const isTelegram = Boolean(
    product && isTelegramProduct(product) && !isLoggsplugProduct(product),
  );
  const hasTelegramDetails = isTelegram
    && Boolean(deliveredDetails?.trim())
    && deliveredDetails!.trim() !== TELEGRAM_MANUAL_FULFILLMENT_MARKER;
  const isPendingRdp =
    product && isRdpProduct(product) && !deliveredDetails?.trim();
  const pendingMessage =
    isTelegram && !hasTelegramDetails
      ? getTelegramPendingDetailsMessage()
      : isPendingRdp
        ? RDP_PENDING_DETAILS_MESSAGE
        : null;

  useModalLock(open, onClose);

  if (!open) return null;

  const displayTitle = product?.title ?? fallbackTitle ?? 'Purchased product';
  const displayDescription = product
    ? getLoggsplugDisplayDescription(product)
      || fallbackDescription
      || 'Product record is no longer active, but your delivered details are still available below.'
    : (fallbackDescription ?? 'Product record is no longer active, but your delivered details are still available below.');

  const handleCopyLog = async () => {
    try {
      const copied = await copyToClipboard(logContent);
      if (!copied) throw new Error('Copy failed');
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
        className="relative flex w-full max-w-2xl max-h-modal flex-col overflow-hidden bg-white dark:bg-dm-surface rounded-xl shadow-xl"
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
            <span className="uppercase">{displayTitle}</span>
          </p>

          <div>
            <p className="font-bold mb-1">Description:</p>
            {product && isLoggsplugProduct(product) ? (
              <LoggsplugDescriptionView text={displayDescription} />
            ) : (
              <LinkifiedText text={displayDescription} />
            )}
          </div>

          <p>
            <span className="font-bold">Order Date:</span> {formatPurchaseDate(orderDate)}
          </p>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-bold">Product details/Log:</span>
              {!(isTelegram && !hasTelegramDetails) && !isPendingRdp && (
                <button
                  type="button"
                  onClick={handleCopyLog}
                  className="text-xs font-medium bg-[#f26522] text-white px-3 py-1 rounded hover:bg-[#d94e0f] transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            {pendingMessage ? (
              <div className="rounded border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                {pendingMessage}
              </div>
            ) : (
              <div className="rounded border border-gray-300 dark:border-dm-border bg-white dark:bg-dm-product-row p-3 min-h-[180px] max-h-[320px] overflow-y-auto">
                <LinkifiedText
                  text={logContent}
                  className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed"
                  as="div"
                />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-3 px-6 py-4 border-t border-gray-200 dark:border-dm-border sm:flex-row sm:items-center sm:justify-between">
          {redirectSecondsLeft != null ? (
            <p className="text-xs text-gray-600 dark:text-gray-300 sm:pr-4">
              Copy your details now. Taking you to <span className="font-semibold">My Purchases</span>
              {' '}in <span className="font-semibold text-[#f26522]">{redirectSecondsLeft}s</span>
              {' '}— you can reopen them there anytime.
            </p>
          ) : (
            <span className="hidden sm:block" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 self-end text-sm font-medium bg-gray-200 dark:bg-dm-border text-gray-800 dark:text-gray-200 px-5 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors sm:self-auto"
          >
            {redirectSecondsLeft != null ? 'Go to My Purchases' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
