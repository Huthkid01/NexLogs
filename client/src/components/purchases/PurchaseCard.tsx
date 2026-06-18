import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ProductDetailsModal } from '@/components/home/ProductDetailsModal';
import {
  formatPurchaseAmount,
  formatPurchaseDate,
  getDisplayOrderId,
  getPurchasePlatformLabel,
} from '@/lib/purchase-utils';
import type { Order } from '@/types';

interface PurchaseCardProps {
  order: Order;
}

export function PurchaseCard({ order }: PurchaseCardProps) {
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const product = order.order_items?.[0]?.product;
  const orderId = getDisplayOrderId(order.order_number);

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      toast.success('Order ID copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy order ID');
    }
  };

  const handleView = () => {
    if (!product) {
      toast.error('Product details unavailable');
      return;
    }
    setDetailsOpen(true);
  };

  return (
    <>
      <article className="rounded-lg border border-gray-200 dark:border-dm-border bg-white dark:bg-dm-surface p-4 flex flex-col min-h-[260px]">
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-all leading-snug mt-0.5">
            {orderId}
          </p>
          <button
            type="button"
            onClick={handleCopyOrderId}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#f26522]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#1b5e20]" /> : <Copy className="h-3.5 w-3.5" />}
            Copy Order ID
          </button>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase leading-snug line-clamp-3">
            {product?.title ?? 'Purchased product'}
          </h3>
          {product && (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mt-2 tracking-wide">
              {getPurchasePlatformLabel(product)}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
            Date: {formatPurchaseDate(order.created_at)}
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
            Amount: {formatPurchaseAmount(Number(order.total_amount))}
          </p>
        </div>

        <button
          type="button"
          onClick={handleView}
          className="mt-4 self-start text-sm font-medium bg-[#f26522] text-white px-4 py-1.5 rounded-md hover:bg-[#d94e0f] transition-colors"
        >
          View
        </button>
      </article>

      {product && (
        <ProductDetailsModal
          product={product}
          orderDate={order.created_at}
          logSeed={`${order.id}-credentials`}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </>
  );
}
