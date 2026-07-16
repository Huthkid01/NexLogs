import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useModalLock } from '@/hooks/useModalLock';
import { ProductDetailsModal } from '@/components/home/ProductDetailsModal';
import { PurchaseReviewModal } from '@/components/purchases/PurchaseReviewModal';
import { ProductIcon } from '@/components/common/ProductIcon';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { LoggsplugDescriptionView } from '@/components/home/LoggsplugDescriptionView';
import { openErrorReport } from '@/lib/error-report';
import {
  getPurchaseErrorMessage,
  isAuthError,
  isInsufficientFundsError,
  isOutOfStockError,
} from '@/lib/purchase-errors';
import { getDisplayOrderId } from '@/lib/purchase-utils';
import { getProductVariants } from '@/lib/product-variants';
import { isLoggsplugProduct, isLoggsplugProductImageUrl } from '@/lib/loggsplug-utils';
import {
  getLoggsplugDisplayDescription,
  getLoggsplugInstructionsHeading,
  getLoggsplugPrePurchaseInstructions,
  shouldShowLoggsplugInstructionsSection,
} from '@/lib/loggsplug-display';
import { isTelegramProduct, TELEGRAM_PRE_PURCHASE_INSTRUCTIONS } from '@/lib/telegram-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { orderService, productService, profileService } from '@/services';
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
  const { formatProductPrice, formatDisplayAmount } = useFormatDisplayPrice();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [logSeed, setLogSeed] = useState('');
  const [deliveredDetails, setDeliveredDetails] = useState<string | null>(null);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [pendingReview, setPendingReview] = useState<{
    orderId: string;
    productId: string;
    productTitle: string;
  } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useModalLock(open, onClose);

  const { data: liveProduct } = useQuery({
    queryKey: ['product', product?.id],
    queryFn: () => productService.getById(product!.id),
    enabled: open && !!product?.id,
    staleTime: 0,
  });

  const displayProduct = liveProduct ?? product;
  const variants = displayProduct ? getProductVariants(displayProduct) : [];
  const previewUrl = displayProduct?.preview_url?.trim() ?? '';
  const isTelegram = displayProduct ? isTelegramProduct(displayProduct) : false;
  const isLoggsplug = displayProduct ? isLoggsplugProduct(displayProduct) : false;
  const showProductPreview = Boolean(
    previewUrl && !(isLoggsplug && isLoggsplugProductImageUrl(previewUrl)),
  );
  const displayDescription = displayProduct ? getLoggsplugDisplayDescription(displayProduct) : '';
  const loginInstructions = displayProduct?.login_instructions?.trim();
  const loggsplugInstructions = displayProduct ? getLoggsplugPrePurchaseInstructions(displayProduct) : '';
  const displayInstructions = isTelegram
    ? loginInstructions || TELEGRAM_PRE_PURCHASE_INSTRUCTIONS
    : isLoggsplug
      ? loggsplugInstructions
      : loginInstructions;
  const showInstructionsSection = isTelegram
    ? Boolean(displayInstructions)
    : isLoggsplug
      ? shouldShowLoggsplugInstructionsSection(displayProduct)
      : Boolean(displayInstructions);
  const instructionsHeading = isTelegram
    ? 'How to receive your order'
    : isLoggsplug
      ? getLoggsplugInstructionsHeading(displayProduct)
      : 'Login instructions';

  const { data: walletStats, refetch: refetchWalletBalance } = useWalletBalance(user?.id);

  useEffect(() => {
    if (open && user?.id) {
      void refetchWalletBalance();
    }
  }, [open, user?.id, refetchWalletBalance]);

  const showInsufficientBalance = (price: number, balance: number) => {
    setRequiredAmount(price);
    setCurrentBalance(balance);
    setInsufficientOpen(true);
    void queryClient.setQueryData(['profile-stats', user?.id], (current: typeof walletStats | undefined) => ({
      balance,
      total_purchases: current?.total_purchases ?? 0,
      total_spent: current?.total_spent ?? 0,
    }));
    void queryClient.setQueryData(['wallet-balance', user?.id], {
      balance,
      total_purchases: walletStats?.total_purchases ?? 0,
      total_spent: walletStats?.total_spent ?? 0,
    });
    toast.error('Insufficient balance. Add funds to continue.');
  };

  const handleBuy = async (variantId: string, price: number) => {
    if (!displayProduct) return;
    if (!user) {
      toast.error('Please login first');
      navigate('/login', { state: { from: { pathname: '/marketplace' } } });
      return;
    }

    setPurchasing(true);
    try {
      const freshStats = await profileService.getStats(user.id);
      void queryClient.setQueryData(['profile-stats', user.id], freshStats);
      void queryClient.setQueryData(['wallet-balance', user.id], freshStats);

      if (freshStats.balance < price) {
        showInsufficientBalance(price, freshStats.balance);
        return;
      }

      let purchasedDetails: string | null = null;
      let purchaseCreatedAt = new Date().toISOString();
      let purchaseOrderNumber = '';
      let reviewOrderId = '';

      if (isLoggsplug) {
        const result = await orderService.purchaseLoggsplugWithWallet(displayProduct.id, 1);
        purchasedDetails = result.deliveredDetails ?? null;
        purchaseCreatedAt = result.createdAt ?? purchaseCreatedAt;
        purchaseOrderNumber = result.orderNumber ? getDisplayOrderId(result.orderNumber) : '';
        reviewOrderId = result.orderId;
      } else {
        const orderId = await orderService.purchaseWithWallet(displayProduct.id, 1);
        const order = await orderService.getOrderById(orderId);
        const purchasedItem = order?.order_items?.find((item) => item.product_id === displayProduct.id)
          ?? order?.order_items?.[0];
        purchasedDetails = purchasedItem?.delivered_details ?? null;
        purchaseCreatedAt = order?.created_at ?? purchaseCreatedAt;
        purchaseOrderNumber = order?.order_number ? getDisplayOrderId(order.order_number) : '';
        reviewOrderId = order?.id ?? orderId;
      }

      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile-stats', user.id] });
      setLogSeed(variantId);
      setPurchaseDate(purchaseCreatedAt);
      setPurchaseOrderId(purchaseOrderNumber);
      setDeliveredDetails(purchasedDetails);
      if (reviewOrderId) {
        setPendingReview({
          orderId: reviewOrderId,
          productId: displayProduct.id,
          productTitle: displayProduct.title,
        });
      }
      setDetailsOpen(true);
      onClose();
      toast.success('Purchase successful');
    } catch (err: unknown) {
      if (isInsufficientFundsError(err)) {
        const latest = await profileService.getStats(user.id).catch(() => null);
        showInsufficientBalance(price, latest?.balance ?? walletStats?.balance ?? 0);
        return;
      }

      if (isAuthError(err)) {
        toast.error('Your session expired. Please sign in again.');
        onClose();
        navigate('/login', { state: { from: { pathname: '/marketplace' } } });
        return;
      }

      if (isOutOfStockError(err)) {
        toast.error('This product is out of stock.');
        return;
      }

      const message = getPurchaseErrorMessage(err);
      const friendly = isLoggsplug
        ? 'We could not complete this purchase right now. Please contact support and we will help you.'
        : /loggsplug|supplier|reseller/i.test(message)
          ? message
          : message && message !== 'Purchase failed'
            ? message
            : 'We could not complete this purchase.';

      toast.error(friendly);
      openErrorReport({
        title: 'Error while purchasing',
        message: friendly,
        source: 'checkout',
        errorMessage: message,
        reasonOptions: ['Product purchase failed', 'Wallet payment problem', 'Insufficient funds', 'Other'],
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handlePreview = () => {
    if (!previewUrl) return;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setLogSeed('');
    setPurchaseDate('');
    setPurchaseOrderId('');
    setDeliveredDetails(null);
    if (pendingReview) {
      setReviewOpen(true);
    }
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    setPendingReview(null);
  };

  return (
    <>
      {open && displayProduct && (
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
          className="relative flex w-full max-w-2xl max-h-modal flex-col overflow-hidden bg-white dark:bg-dm-surface rounded-xl shadow-xl"
        >
          <div className="shrink-0 flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-300 dark:border-dm-border bg-white dark:bg-dm-surface">
            <h2
              id="product-variants-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 uppercase leading-snug pr-4"
            >
              {displayProduct.title}
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
                <ProductIcon product={displayProduct} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Description
                  </p>
                  {isLoggsplug ? (
                    <LoggsplugDescriptionView text={displayDescription} emphasize />
                  ) : (
                    <LinkifiedText
                      text={displayDescription}
                      className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap"
                    />
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    {displayProduct.stock} pcs available
                  </p>
                </div>
              </div>
            </div>

            {showInstructionsSection && displayInstructions ? (
              <div className="rounded-lg border border-gray-200 dark:border-dm-border dark:bg-dm-product-row p-4 mb-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  {instructionsHeading}
                </p>
                {isLoggsplug ? (
                  <LoggsplugDescriptionView text={displayInstructions} />
                ) : (
                  <LinkifiedText
                    text={displayInstructions}
                    className="text-sm leading-relaxed break-words whitespace-pre-wrap text-gray-800 dark:text-gray-200"
                    as="div"
                  />
                )}
              </div>
            ) : null}

            <div className="-mx-5 sm:-mx-6 border-t border-gray-300 dark:border-dm-border">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="transition-colors hover:bg-gray-50 dark:bg-dm-product-row dark:hover:bg-dm-product-row-hover"
                >
                  <div className="py-4 px-5 sm:px-6">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-relaxed uppercase">
                      {displayProduct.title}{' '}
                      <span className="text-[#1b5e20] font-semibold normal-case">{formatProductPrice(variant.price)}</span>
                    </p>

                    <div className="flex items-center justify-end gap-3 mt-3">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          disabled={purchasing}
                          onClick={() => handleBuy(variant.id, variant.price)}
                          className="text-sm font-medium text-[#f26522] hover:underline"
                        >
                          Buy
                        </button>
                        {showProductPreview ? (
                          <button
                            type="button"
                            onClick={handlePreview}
                            className="text-sm font-medium text-[#f26522] hover:underline"
                          >
                            Preview
                          </button>
                        ) : null}
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
              Your wallet balance is not enough to buy this product. If support just added funds to your wallet,
              close this message and try again.
            </p>
            <div className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-200">
              <p>Required: <span className="font-semibold">{formatDisplayAmount(requiredAmount)}</span></p>
              <p>Balance: <span className="font-semibold">{formatDisplayAmount(currentBalance)}</span></p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={async () => {
                  if (!user?.id) return;
                  const latest = await profileService.getStats(user.id).catch(() => null);
                  if (latest && latest.balance >= requiredAmount) {
                    setInsufficientOpen(false);
                    toast.success('Balance updated. You can buy now.');
                    return;
                  }
                  if (latest) {
                    setCurrentBalance(latest.balance);
                  }
                  toast.message('Balance refreshed. Add funds if the amount is still too low.');
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-dm-border dark:text-gray-100 dark:hover:bg-dm-product-row"
              >
                Refresh balance
              </button>
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
        product={displayProduct}
        orderDate={purchaseDate || new Date().toISOString()}
        logSeed={logSeed}
        orderId={purchaseOrderId}
        deliveredDetails={deliveredDetails}
        open={detailsOpen && !!displayProduct && !!logSeed}
        onClose={handleDetailsClose}
      />

      {pendingReview ? (
        <PurchaseReviewModal
          open={reviewOpen}
          onClose={handleReviewClose}
          orderId={pendingReview.orderId}
          productId={pendingReview.productId}
          productTitle={pendingReview.productTitle}
          onSubmitted={handleReviewClose}
        />
      ) : null}
    </>
  );
}
