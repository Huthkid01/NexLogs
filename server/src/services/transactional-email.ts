import { env } from '../env.js';
import { sendMail } from '../mailer.js';
import { getServiceSupabase } from '../supabase.js';
import {
  buildPurchaseEmail,
  buildWalletDepositEmail,
  buildWelcomeEmail,
} from '../templates.js';

export type TransactionalEmailType = 'welcome' | 'purchase' | 'wallet_deposit';

function isRdpSlug(slug: string | null | undefined) {
  return Boolean(slug?.includes('-rdp-'));
}

type PurchaseEmailProduct = {
  title: string;
  slug: string;
  niche?: string | null;
  category?: { slug?: string | null } | { slug?: string | null }[] | null;
};

function isTelegramProduct(product: PurchaseEmailProduct | null | undefined) {
  if (!product) return false;
  const category = Array.isArray(product.category) ? product.category[0] : product.category;
  if (category?.slug === 'telegram') return true;
  if (product.niche?.trim().toLowerCase() === 'telegram') return true;
  if (product.slug.includes('telegram')) return true;
  if (product.title.toUpperCase().includes('TELEGRAM')) return true;
  return false;
}

function resolvePurchaseFulfillmentType(items: Array<{ product: unknown }>) {
  const products = items
    .map((item) => normalizeProduct(item.product))
    .filter(Boolean) as PurchaseEmailProduct[];

  if (products.some(isTelegramProduct)) return 'telegram';
  if (products.some((product) => isRdpSlug(product.slug))) return 'rdp';
  return 'standard';
}

function normalizeProduct(product: unknown) {
  if (!product) return null;
  if (Array.isArray(product)) return product[0] ?? null;
  return product as PurchaseEmailProduct;
}

function formatNgn(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export async function sendTransactionalEmail(input: {
  type: TransactionalEmailType;
  userId?: string;
  orderId?: string;
  transactionId?: string;
}) {
  const supabase = getServiceSupabase();
  const appName = env.appName;
  const appUrl = env.appUrl;

  if (input.type === 'welcome') {
    if (!input.userId) throw new Error('Missing user_id');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', input.userId)
      .single();
    const profileRow = profile as { full_name: string | null; email: string } | null;
    if (error || !profileRow?.email) throw error ?? new Error('Profile not found');

    const email = buildWelcomeEmail({
      appName,
      appUrl,
      fullName: profileRow.full_name || profileRow.email.split('@')[0],
    });
    await sendMail({ to: profileRow.email, ...email });
    return;
  }

  if (input.type === 'purchase') {
    if (!input.orderId) throw new Error('Missing order_id');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        total_amount,
        status,
        order_items(
          quantity,
          price,
          product:products(title, slug, niche, category:categories(slug))
        )
      `)
      .eq('id', input.orderId)
      .single();
    if (orderError || !order) throw orderError ?? new Error('Order not found');
    const orderRow = order as {
      id: string;
      order_number: string | null;
      user_id: string;
      total_amount: number;
      status: string;
      order_items: Array<{
        quantity: number;
        price: number;
        product: { title: string; slug: string } | { title: string; slug: string }[] | null;
      }> | null;
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', orderRow.user_id)
      .single();
    const profileRow = profile as { full_name: string | null; email: string } | null;
    if (profileError || !profileRow?.email) throw profileError ?? new Error('Buyer profile not found');

    const items = orderRow.order_items ?? [];
    const productLines = items.map((item) => {
      const product = normalizeProduct(item.product);
      return `${product?.title ?? 'Product'} x${item.quantity} — ${formatNgn(item.price)}`;
    });
    const fulfillmentType = resolvePurchaseFulfillmentType(items);

    const email = buildPurchaseEmail({
      appName,
      appUrl,
      fullName: profileRow.full_name || profileRow.email.split('@')[0],
      orderNumber: orderRow.order_number || orderRow.id,
      productLines,
      totalAmount: Number(orderRow.total_amount),
      fulfillmentType,
    });
    await sendMail({ to: profileRow.email, ...email });
    return;
  }

  if (input.type === 'wallet_deposit') {
    if (!input.transactionId) throw new Error('Missing transaction_id');

    const { data: tx, error: txError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, ref, kind, status')
      .eq('id', input.transactionId)
      .single();
    if (txError || !tx) throw txError ?? new Error('Transaction not found');
    const txRow = tx as {
      id: string;
      user_id: string;
      amount: number;
      ref: string | null;
      kind: string;
      status: string;
    };
    if (txRow.kind !== 'deposit' || txRow.status !== 'completed') {
      throw new Error('Transaction is not a completed deposit');
    }

    const [{ data: profile, error: profileError }, { data: wallet, error: walletError }] =
      await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', txRow.user_id).single(),
        supabase.from('wallets').select('balance').eq('user_id', txRow.user_id).single(),
      ]);
    const profileRow = profile as { full_name: string | null; email: string } | null;
    const walletRow = wallet as { balance: number } | null;
    if (profileError || !profileRow?.email) throw profileError ?? new Error('Profile not found');
    if (walletError || !walletRow) throw walletError ?? new Error('Wallet not found');

    const email = buildWalletDepositEmail({
      appName,
      appUrl,
      fullName: profileRow.full_name || profileRow.email.split('@')[0],
      amountNgn: Number(txRow.amount),
      newBalance: Number(walletRow.balance),
      reference: txRow.ref || txRow.id,
    });
    await sendMail({ to: profileRow.email, ...email });
    return;
  }

  throw new Error(`Unsupported email type: ${input.type}`);
}
