export function getFlutterwavePublicKey() {
  const key = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY as string | undefined;
  if (!key?.trim()) return null;
  return key.trim();
}

export function isFlutterwaveConfigured() {
  return Boolean(getFlutterwavePublicKey());
}

export function isFlutterwaveTestMode() {
  const key = getFlutterwavePublicKey();
  return key?.includes('_TEST-') ?? false;
}

export function createDepositTxRef(userId: string) {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `NEX-${userId.slice(0, 8)}-${Date.now()}-${suffix}`;
}
