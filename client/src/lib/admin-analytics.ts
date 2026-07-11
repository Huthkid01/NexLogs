import type { AdminAnalyticsSnapshot, OrderStatus } from '@/types';

interface AnalyticsOrder {
  total_amount: number;
  status: OrderStatus;
  payment_status: string;
  created_at: string;
}

interface AnalyticsOrderItem {
  quantity: number;
  price: number;
  product: {
    platform: string;
    country: string | null;
    slug: string;
    title: string;
  } | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

interface AnalyticsSmsOrder {
  charged_ngn: number;
  status: string;
  created_at: string;
  country_name: string | null;
  country_id: string;
}

const SMS_STATUS_LABELS: Record<string, string> = {
  active: 'SMS Active',
  completed: 'SMS Completed',
  cancelled: 'SMS Cancelled',
  refunded: 'SMS Refunded',
  expired: 'SMS Expired',
};

function isCountableOrder(order: AnalyticsOrder): boolean {
  return order.payment_status === 'paid' && order.status !== 'cancelled';
}

function isCountableSmsOrder(order: AnalyticsSmsOrder): boolean {
  return order.status === 'active' || order.status === 'completed';
}

function getPlatformLabel(product: NonNullable<AnalyticsOrderItem['product']>): string {
  if (product.slug.includes('-rdp-')) return 'RDP';
  return PLATFORM_LABELS[product.platform] ?? product.platform;
}

function getCountryLabel(country: string | null | undefined): string {
  const trimmed = country?.trim();
  return trimmed || 'Unknown';
}

function buildRevenueWeekBuckets() {
  const buckets: Array<{ label: string; start: Date; end: Date }> = [];

  for (let weekIndex = 3; weekIndex >= 0; weekIndex -= 1) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - weekIndex * 7);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const label = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    buckets.push({ label, start, end });
  }

  return buckets;
}

function toPercentageMap(totals: Map<string, number>): { label: string; value: number }[] {
  const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  if (grandTotal <= 0) return [];

  return Array.from(totals.entries())
    .map(([label, amount]) => ({
      label,
      value: Math.round((amount / grandTotal) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildAdminAnalyticsSnapshot(
  orders: AnalyticsOrder[],
  orderItems: AnalyticsOrderItem[],
  smsOrders: AnalyticsSmsOrder[] = [],
): AdminAnalyticsSnapshot {
  const countableOrders = orders.filter(isCountableOrder);
  const countableSmsOrders = smsOrders.filter(isCountableSmsOrder);
  const weekBuckets = buildRevenueWeekBuckets();

  const revenueByWeek = weekBuckets.map((bucket) => {
    const productRevenue = countableOrders.reduce((sum, order) => {
      const createdAt = new Date(order.created_at);
      if (createdAt >= bucket.start && createdAt <= bucket.end) {
        return sum + Number(order.total_amount);
      }
      return sum;
    }, 0);

    const smsRevenue = countableSmsOrders.reduce((sum, order) => {
      const createdAt = new Date(order.created_at);
      if (createdAt >= bucket.start && createdAt <= bucket.end) {
        return sum + Number(order.charged_ngn);
      }
      return sum;
    }, 0);

    return { label: bucket.label, value: Math.round((productRevenue + smsRevenue) * 100) / 100 };
  });

  const platformTotals = new Map<string, number>();
  for (const item of orderItems) {
    if (!item.product) continue;
    const label = getPlatformLabel(item.product);
    const amount = Number(item.price) * Number(item.quantity);
    platformTotals.set(label, (platformTotals.get(label) ?? 0) + amount);
  }
  for (const smsOrder of countableSmsOrders) {
    const amount = Number(smsOrder.charged_ngn);
    platformTotals.set('SMS Verification', (platformTotals.get('SMS Verification') ?? 0) + amount);
  }

  const countryTotals = new Map<string, number>();
  for (const item of orderItems) {
    if (!item.product) continue;
    const label = getCountryLabel(item.product.country);
    const amount = Number(item.quantity);
    countryTotals.set(label, (countryTotals.get(label) ?? 0) + amount);
  }
  for (const smsOrder of countableSmsOrders) {
    const label = getCountryLabel(smsOrder.country_name || smsOrder.country_id);
    countryTotals.set(label, (countryTotals.get(label) ?? 0) + 1);
  }

  const statusCounts = new Map<string, number>();
  for (const order of orders) {
    const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
    statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1);
  }
  for (const smsOrder of smsOrders) {
    const label = SMS_STATUS_LABELS[smsOrder.status] ?? `SMS ${smsOrder.status}`;
    statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1);
  }

  return {
    revenueByWeek,
    platformBreakdown: toPercentageMap(platformTotals),
    topCountries: toPercentageMap(countryTotals),
    orderStatusBreakdown: Array.from(statusCounts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}

export const EMPTY_ADMIN_ANALYTICS: AdminAnalyticsSnapshot = {
  revenueByWeek: buildRevenueWeekBuckets().map((bucket) => ({ label: bucket.label, value: 0 })),
  platformBreakdown: [],
  topCountries: [],
  orderStatusBreakdown: [],
};
