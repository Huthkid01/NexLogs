import { isLoggsplugProduct } from '@/lib/loggsplug-utils';
import { isRdpProduct, RDP_PENDING_DETAILS_MESSAGE } from '@/lib/rdp-utils';
import {
  getTelegramPendingDetailsMessage,
  isTelegramPendingDelivery,
  isTelegramProduct,
  TELEGRAM_MANUAL_FULFILLMENT_MARKER,
} from '@/lib/telegram-utils';
import { parseProductDetailLines } from '@/lib/product-details';
import type { Product } from '@/types';

export interface AccountDetailField {
  label: string;
  value: string;
}

export interface AccountDetails {
  fields: AccountDetailField[];
  fullCredentials: string;
}

const NO_DETAILS_MESSAGE =
  'Account details are not available yet. Contact support if you need help with your order.';

export function getProductLog(
  product: Product,
  _seed: string,
  deliveredDetails?: string | null,
): string {
  const purchasedDetails = deliveredDetails?.trim();

  // LOGGSPLUG (and any purchased inventory) credentials always win — even if the title
  // includes "TELEGRAM", which would otherwise trigger the manual Telegram pathway.
  if (
    purchasedDetails
    && purchasedDetails !== TELEGRAM_MANUAL_FULFILLMENT_MARKER
    && !isTelegramPendingDelivery(purchasedDetails)
  ) {
    return purchasedDetails;
  }

  if (isLoggsplugProduct(product)) {
    return NO_DETAILS_MESSAGE;
  }

  if (isTelegramProduct(product) || purchasedDetails === TELEGRAM_MANUAL_FULFILLMENT_MARKER) {
    return getTelegramPendingDetailsMessage();
  }

  if (isRdpProduct(product)) {
    return RDP_PENDING_DETAILS_MESSAGE;
  }

  const savedDetails = product.product_details?.trim();
  if (savedDetails) {
    const lines = parseProductDetailLines(savedDetails);
    if (lines.length === 1) return lines[0];
    // Never expose unsold inventory when delivered_details was not saved on the order.
    return NO_DETAILS_MESSAGE;
  }

  return NO_DETAILS_MESSAGE;
}
