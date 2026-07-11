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

/** SMS orders that actually received a code (excludes cancel/refund/expired and pending numbers). */
export function isCountableSmsOrder(order: {
  status: string;
  verification_code: string | null;
}): boolean {
  if (order.status === 'cancelled' || order.status === 'refunded' || order.status === 'expired') {
    return false;
  }
  return isValidSmsVerificationCode(order.verification_code);
}
