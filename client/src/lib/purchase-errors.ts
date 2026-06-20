export function getPurchaseErrorMessage(error: unknown): string {
  if (!error) return 'Purchase failed';
  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    const postgrest = error as Error & { details?: string; hint?: string };
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

export function isInsufficientFundsError(error: unknown): boolean {
  const normalized = getPurchaseErrorMessage(error).toUpperCase();

  return (
    normalized.includes('INSUFFICIENT_FUNDS') ||
    normalized.includes('INSUFFICIENT FUNDS') ||
    normalized.includes('INSUFFICIENT BALANCE') ||
    normalized.includes('INSUFFICIENT BALANCES')
  );
}

export function isOutOfStockError(error: unknown): boolean {
  return getPurchaseErrorMessage(error).toUpperCase().includes('OUT OF STOCK');
}
