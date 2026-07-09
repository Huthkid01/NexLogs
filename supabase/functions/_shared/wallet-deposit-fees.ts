export const MIN_WALLET_DEPOSIT_NGN = 2000;
export const DEPOSIT_FEE_LOW_NGN = 100;
export const DEPOSIT_FEE_HIGH_NGN = 200;
export const DEPOSIT_FEE_LOW_MAX_NGN = 10000;
export const DEPOSIT_FEE_HIGH_MIN_NGN = 20000;

export function getDepositFeeNgn(walletAmountNgn: number): number {
  if (!Number.isFinite(walletAmountNgn) || walletAmountNgn < MIN_WALLET_DEPOSIT_NGN) {
    return 0;
  }

  if (walletAmountNgn >= DEPOSIT_FEE_HIGH_MIN_NGN) {
    return DEPOSIT_FEE_HIGH_NGN;
  }

  if (walletAmountNgn <= DEPOSIT_FEE_LOW_MAX_NGN) {
    return DEPOSIT_FEE_LOW_NGN;
  }

  return DEPOSIT_FEE_LOW_NGN;
}

export function getDepositChargeNgn(walletAmountNgn: number): number {
  return walletAmountNgn + getDepositFeeNgn(walletAmountNgn);
}
