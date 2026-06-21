import { isRdpProduct, RDP_PENDING_DETAILS_MESSAGE } from '@/lib/rdp-utils';
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
  if (purchasedDetails) return purchasedDetails;

  if (isRdpProduct(product)) {
    return RDP_PENDING_DETAILS_MESSAGE;
  }

  const savedDetails = product.product_details?.trim();
  if (savedDetails) {
    const lines = parseProductDetailLines(savedDetails);
    if (lines.length === 1) return lines[0];
    if (lines.length > 1) return lines.join('\n\n');
    return savedDetails;
  }

  return NO_DETAILS_MESSAGE;
}
