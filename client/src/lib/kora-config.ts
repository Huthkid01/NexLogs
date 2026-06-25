export function getKoraPublicKey() {
  const key = import.meta.env.VITE_KORA_PUBLIC_KEY as string | undefined;
  if (!key?.trim()) return null;
  return key.trim();
}

export function isKoraConfigured() {
  return Boolean(getKoraPublicKey());
}

export function isKoraTestMode() {
  const key = getKoraPublicKey();
  return key?.startsWith('pk_test_') ?? false;
}

export function createDepositReference(userId: string) {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `NEX-${userId.slice(0, 8)}-${Date.now()}-${suffix}`;
}
