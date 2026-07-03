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
