export function getPurchaseErrorMessage(error: unknown): string {
  if (!error) return 'Purchase failed';
  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    const postgrest = error as Error & { details?: string; hint?: string; code?: string };
    return [postgrest.message, postgrest.details, postgrest.hint].filter(Boolean).join(' ') || 'Purchase failed';
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return (
      [record.message, record.details, record.hint, record.error_description]
        .filter((value) => typeof value === 'string' && value.trim())
        .join(' ') || 'Purchase failed'
    );
  }

  return 'Purchase failed';
}

function getPurchaseErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

export function isAuthError(error: unknown): boolean {
  const normalized = getPurchaseErrorMessage(error).toUpperCase();
  const code = getPurchaseErrorCode(error);

  return (
    code === '42501' ||
    normalized.includes('NOT AUTHENTICATED') ||
    normalized.includes('AUTHENTICATION REQUIRED') ||
    normalized.includes('JWT EXPIRED') ||
    normalized.includes('INVALID JWT') ||
    normalized.includes('SESSION EXPIRED') ||
    normalized.includes('SESSION NOT FOUND') ||
    normalized.includes('PLEASE LOG IN AGAIN') ||
    normalized.includes('LOG IN AGAIN')
  );
}

export function isInsufficientFundsError(error: unknown): boolean {
  const normalized = getPurchaseErrorMessage(error).toUpperCase();

  return (
    normalized.includes('INSUFFICIENT_FUNDS') ||
    normalized.includes('INSUFFICIENT FUNDS') ||
    normalized.includes('INSUFFICIENT BALANCE') ||
    normalized.includes('INSUFFICIENT BALANCES') ||
    (normalized.includes('INSUFFICIENT') && normalized.includes('WALLET'))
  );
}

export function isOutOfStockError(error: unknown): boolean {
  return getPurchaseErrorMessage(error).toUpperCase().includes('OUT OF STOCK');
}

export function isExpectedPurchaseError(error: unknown): boolean {
  return isInsufficientFundsError(error) || isOutOfStockError(error) || isAuthError(error);
}

const GENERIC_USER_MESSAGE = 'Something went wrong. Please try again or contact support.';

/**
 * Returns a safe, user-friendly message for end users. Known cases (funds, stock,
 * session) get clear wording; technical/network/database errors are hidden behind
 * a generic message so users never see raw console-style text.
 */
export function getFriendlyErrorMessage(
  error: unknown,
  fallback = GENERIC_USER_MESSAGE,
): string {
  if (isInsufficientFundsError(error)) {
    return 'Insufficient wallet balance. Please add funds and try again.';
  }
  if (isOutOfStockError(error)) {
    return 'This item is currently out of stock.';
  }
  if (isAuthError(error)) {
    return 'Your session expired. Please log in again.';
  }

  return fallback;
}
