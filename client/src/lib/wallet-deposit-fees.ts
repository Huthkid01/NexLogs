export const MIN_WALLET_DEPOSIT_NGN = 2000;

/** Wallet credit amounts from NGN 2,000 through NGN 10,000 include a NGN 100 processing fee. */
export const DEPOSIT_FEE_LOW_NGN = 100;

/** Wallet credit amounts from NGN 20,000 upward include a NGN 200 processing fee. */
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
