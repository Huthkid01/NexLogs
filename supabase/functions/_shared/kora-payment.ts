export const KORA_API_BASE = 'https://api.korapay.com/merchant/api/v1';

export interface KoraChargeData {
  reference?: string;
  payment_reference?: string;
  status?: string;
  transaction_status?: string;
  amount?: string | number;
  amount_paid?: string | number;
  amount_accepted?: string | number;
  currency?: string;
  payment_method?: string;
  metadata?: Record<string, unknown>;
}

export interface KoraInitializeResponse {
  status?: boolean;
  message?: string;
  data?: {
    checkout_url?: string;
    reference?: string;
  };
}

export function extractBearerToken(authHeader: string) {
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

export function koraErrorMessage(status: number, payload: { message?: string }) {
  const message = payload.message || 'Kora request failed';
  if (status === 401 || message.toLowerCase().includes('unauthorized')) {
    return 'Kora secret key is invalid or missing. Set KORA_SECRET_KEY in Supabase Edge Function secrets to match your live/test mode.';
  }
  return message;
}

export function isSuccessfulCharge(payment: KoraChargeData) {
  const status = String(payment.status ?? '').toLowerCase();
  const txStatus = String(payment.transaction_status ?? '').toLowerCase();
  return status === 'success' || txStatus === 'success' || txStatus === 'overpaid';
}

export function resolveMerchantReference(clientReference: string, payment: KoraChargeData) {
  const merchantRef = String(payment.payment_reference ?? '').trim();
  if (merchantRef) return merchantRef;
  return clientReference.trim();
}

export function hasPaidExpectedAmount(chargedAmount: number, expectedAmount: number) {
  if (chargedAmount + 0.01 >= expectedAmount) return true;
  return chargedAmount >= expectedAmount * 0.985;
}

export function resolveChargedAmount(payment: KoraChargeData) {
  const raw = payment.amount_accepted ?? payment.amount_paid ?? payment.amount;
  const amount = Number(raw);
  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    throw new Error('Invalid payment amount from Kora');
  }
  return amount;
}

export function resolveCreditAmount(
  payment: KoraChargeData,
  expectedAmountNgn: number,
) {
  const chargedAmount = resolveChargedAmount(payment);
  if (expectedAmountNgn > 0 && hasPaidExpectedAmount(chargedAmount, expectedAmountNgn)) {
    return expectedAmountNgn;
  }
  return chargedAmount;
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function isValidKoraWebhookSignature(
  signature: string | null,
  payloadData: unknown,
  secretKey: string,
) {
  if (!signature || !payloadData) return false;
  const expected = await hmacSha256Hex(secretKey, JSON.stringify(payloadData));
  return signature.trim().toLowerCase() === expected.toLowerCase();
}
