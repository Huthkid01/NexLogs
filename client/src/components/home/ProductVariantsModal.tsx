import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { ProductDetailsModal } from '@/components/home/ProductDetailsModal';
import { PlatformIcon } from '@/components/common/PlatformIcon';
import { openErrorReport } from '@/lib/error-report';
import { isMockMode } from '@/lib/mock-mode';
import { parseProductDetailLines } from '@/lib/product-details';
import {
  getPurchaseErrorMessage,
  isInsufficientFundsError,
  isOutOfStockError,
} from '@/lib/purchase-errors';
import { formatPrice } from '@/lib/utils';
import { getProductVariants } from '@/lib/product-variants';
import { useAuth } from '@/contexts/AuthContext';
import { orderService, profileService } from '@/services';
import type { Product } from '@/types';

interface ProductVariantsModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ProductVariantsModal({ product, open, onClose }: ProductVariantsModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [logSeed, setLogSeed] = useState('');
  const [deliveredDetails, setDeliveredDetails] = useState<string | null>(null);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [purchasing, setPurchasing] = useState(false);

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
    };
  }, [open, onClose]);

  const variants = product ? getProductVariants(product) : [];

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: () => profileService.getStats(user!.id),
    enabled: !!user,
  });

  const showInsufficientBalance = (price: number) => {
    setRequiredAmount(price);
    setInsufficientOpen(true);
    toast.error('Insufficient balance');
  };

  const handleBuy = async (variantId: string, price: number) => {
    if (!product) return;
    if (!user) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }

    if (!statsLoading) {
      const balance = stats?.balance ?? 0;
      if (balance < price) {
        showInsufficientBalance(price);
        return;
      }
    }

    setPurchasing(true);
    try {
      const orderId = await orderService.purchaseWithWallet(product.id, 1);
      let purchasedDetails: string | null = null;
      if (isMockMode()) {
        const lines = parseProductDetailLines(product.product_details);
        purchasedDetails = lines[0] ?? product.product_details ?? null;
      } else {
        const order = await orderService.getOrderById(orderId);
        purchasedDetails = order?.order_items?.[0]?.delivered_details ?? null;
      }
      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile-stats', user.id] });
      setLogSeed(variantId);
      setPurchaseDate(new Date().toISOString());
      setDeliveredDetails(purchasedDetails);
      setDetailsOpen(true);
      onClose();
      toast.success('Purchase successful');
    } catch (err: unknown) {
      if (isInsufficientFundsError(err)) {
        showInsufficientBalance(price);
        return;
      }

      const message = getPurchaseErrorMessage(err);

      if (isOutOfStockError(err)) {
        toast.error('This product is out of stock.');
        return;
      }

      toast.error('We could not complete this purchase.');
      openErrorReport({
        title: 'Error while purchasing',
        message: 'We could not complete this purchase.',
        source: 'checkout',
        errorMessage: message,
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handlePreview = () => {
    toast.info('Preview is not available yet');
  };

  const handleCheckRate = () => {
    toast.info('Current rate: 1 USD = 1500 NGN');
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setLogSeed('');
    setPurchaseDate('');
    setDeliveredDetails(null);
  };

  return (
    <>
      {open && product && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-label="Close modal"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-variants-title"
          className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden bg-white dark:bg-dm-surface rounded-xl shadow-xl"
        >
          <div className="shrink-0 flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-300 dark:border-dm-border bg-white dark:bg-dm-surface">
            <h2
              id="product-variants-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 uppercase leading-snug pr-4"
            >
              {product.title}
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

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
            <div className="rounded-lg border border-gray-200 dark:border-dm-border dark:bg-dm-product-row p-4 mb-4">
              <div className="flex items-start gap-3">
                <PlatformIcon platform={product.platform} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Description
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
                    {product.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    {product.stock} pcs available
                  </p>
                </div>
              </div>
            </div>

            <div className="-mx-5 sm:-mx-6 border-t border-gray-300 dark:border-dm-border">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="transition-colors hover:bg-gray-50 dark:bg-dm-product-row dark:hover:bg-dm-product-row-hover"
                >
                  <div className="py-4 px-5 sm:px-6">
                    <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                      {variant.description}{' '}
                      <span className="text-[#1b5e20] font-semibold">{formatPrice(variant.price)}</span>
                    </p>

                    <div className="flex items-center justify-between gap-3 mt-3">
                      <button
                        type="button"
                        onClick={handleCheckRate}
                        className="text-sm font-medium text-[#f26522] hover:underline"
                      >
                        Check Rate
                      </button>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          disabled={purchasing}
                          onClick={() => handleBuy(variant.id, variant.price)}
                          className="text-sm font-medium text-[#f26522] hover:underline"
                        >
                          Buy
                        </button>
                        <button
                          type="button"
                          onClick={handlePreview}
                          className="text-sm font-medium text-[#f26522] hover:underline"
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="h-0.5 w-full bg-gray-300 dark:bg-dm-border" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {insufficientOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setInsufficientOpen(false)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-dm-surface p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Insufficient balance</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Your wallet balance is not enough to buy this product. Add funds to continue.
            </p>
            <div className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-200">
              <p>Required: <span className="font-semibold">{formatPrice(requiredAmount)}</span></p>
              <p>Balance: <span className="font-semibold">{formatPrice(stats?.balance ?? 0)}</span></p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setInsufficientOpen(false);
                  navigate('/add-funds');
                }}
                className="flex-1 rounded-md bg-[#f26522] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d94e0f]"
              >
                Add funds
              </button>
              <button
                type="button"
                onClick={() => setInsufficientOpen(false)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-dm-border dark:text-gray-100 dark:hover:bg-dm-product-row"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductDetailsModal
        product={product}
        orderDate={purchaseDate || new Date().toISOString()}
        logSeed={logSeed}
        deliveredDetails={deliveredDetails}
        open={detailsOpen && !!product && !!logSeed}
        onClose={handleDetailsClose}
      />
    </>
  );
}
