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
  if (!key) return false;
  return key.includes('TEST') || key.endsWith('-X');
}
