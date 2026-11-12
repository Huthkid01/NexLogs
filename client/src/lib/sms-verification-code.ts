export function isValidSmsVerificationCode(code: unknown): boolean {
  const normalized = String(code ?? '').trim();
  if (!normalized) return false;
  if (normalized === '0') return false;
  if (/^0+$/.test(normalized)) return false;
  if (/^\d{4,8}$/.test(normalized)) return true;
  if (normalized.length >= 4 && /^[a-zA-Z0-9]+$/.test(normalized)) return true;
  return false;
}

export function getDisplaySmsVerificationCode(order: {
  verification_code: string | null;
}): string | null {
  return isValidSmsVerificationCode(order.verification_code)
    ? String(order.verification_code).trim()
    : null;
}

/**
 * SMS sales that should count in analytics/revenue.
 * Includes billed activations (active or completed). Excludes cancel/refund/expired.
 * Code delivery is not required — charging the wallet is the sale.
 */
export function isCountableSmsOrder(order: {
  status: string;
  verification_code: string | null;
}): boolean {
  if (order.status === 'cancelled' || order.status === 'refunded' || order.status === 'expired') {
    return false;
  }
  return order.status === 'active' || order.status === 'completed' || isValidSmsVerificationCode(order.verification_code);
}

/** History rows: only finished activations that received a verification code. */
export function isSmsHistoryOrder(order: {
  status: string;
  verification_code: string | null;
}): boolean {
  return order.status === 'completed' && isValidSmsVerificationCode(order.verification_code);
}
