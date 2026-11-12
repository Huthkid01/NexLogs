import type {
  AdminAnalyticsRangeTotals,
  AdminAnalyticsSnapshot,
  AdminAnalyticsStockItem,
  AdminAnalyticsTrendPoint,
  OrderStatus,
} from '@/types';
import { isCountableSmsOrder } from '@/lib/sms-verification-code';

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
  order?: {
    payment_status: string;
    status: string;
  } | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
  telegram: 'Telegram',
  loggsplug: 'Loggsplug',
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
  verification_code: string | null;
}

const SMS_STATUS_LABELS: Record<string, string> = {
  active: 'SMS Active',
  completed: 'SMS Completed',
  cancelled: 'SMS Cancelled',
  refunded: 'SMS Refunded',
  expired: 'SMS Expired',
};

export function isCountableProductOrder(order: {
  payment_status: string;
  status: string;
}): boolean {
  return (
    order.payment_status === 'paid'
    && order.status !== 'cancelled'
    && order.status !== 'refunded'
  );
}

function isCountableOrder(order: AnalyticsOrder): boolean {
  return isCountableProductOrder(order);
}

function getPlatformLabel(product: NonNullable<AnalyticsOrderItem['product']>): string {
  if (product.slug.includes('-rdp-')) return 'RDP';
  return PLATFORM_LABELS[product.platform] ?? product.platform;
}

function getCountryLabel(country: string | null | undefined): string {
  const trimmed = country?.trim();
  return trimmed || 'Unknown';
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sumSalesInRange(
  countableOrders: AnalyticsOrder[],
  countableSmsOrders: AnalyticsSmsOrder[],
  start: Date,
  end: Date,
): { revenue: number; orders: number } {
  let revenue = 0;
  let orders = 0;

  for (const order of countableOrders) {
    const createdAt = new Date(order.created_at);
    if (createdAt >= start && createdAt <= end) {
      revenue += Number(order.total_amount);
      orders += 1;
    }
  }

  for (const smsOrder of countableSmsOrders) {
    const createdAt = new Date(smsOrder.created_at);
    if (createdAt >= start && createdAt <= end) {
      revenue += Number(smsOrder.charged_ngn);
      orders += 1;
    }
  }

  return { revenue: roundMoney(revenue), orders };
}

function buildDayBuckets(count: number) {
  const buckets: Array<{ label: string; start: Date; end: Date }> = [];
  const today = startOfDay(new Date());

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const start = new Date(today);
    start.setDate(today.getDate() - offset);
    const end = endOfDay(start);
    const label = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    buckets.push({ label, start, end });
  }

  return buckets;
}

function buildWeekBuckets(count: number) {
  const buckets: Array<{ label: string; start: Date; end: Date }> = [];

  for (let weekIndex = count - 1; weekIndex >= 0; weekIndex -= 1) {
    const end = endOfDay(new Date());
    end.setDate(end.getDate() - weekIndex * 7);

    const start = startOfDay(new Date(end));
    start.setDate(start.getDate() - 6);

    const label = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    buckets.push({ label, start, end });
  }

  return buckets;
}

function buildMonthBuckets(count: number) {
  const buckets: Array<{ label: string; start: Date; end: Date }> = [];
  const now = new Date();

  for (let monthIndex = count - 1; monthIndex >= 0; monthIndex -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() - monthIndex + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    buckets.push({ label, start, end });
  }

  return buckets;
}

function mapTrendBuckets(
  buckets: Array<{ label: string; start: Date; end: Date }>,
  countableOrders: AnalyticsOrder[],
  countableSmsOrders: AnalyticsSmsOrder[],
): AdminAnalyticsTrendPoint[] {
  return buckets.map((bucket) => {
    const totals = sumSalesInRange(countableOrders, countableSmsOrders, bucket.start, bucket.end);
    return {
      label: bucket.label,
      revenue: totals.revenue,
      orders: totals.orders,
    };
  });
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

function buildStockSummary(stockInventory: AdminAnalyticsStockItem[]) {
  let inStock = 0;
  let low = 0;
  let out = 0;
  let totalUnits = 0;

  for (const item of stockInventory) {
    const qty = Number(item.stock) || 0;
    totalUnits += Math.max(0, qty);
    if (qty <= 0) out += 1;
    else if (qty <= 5) low += 1;
    else inStock += 1;
  }

  return { inStock, low, out, totalUnits };
}

function currentRangeWindow(kind: 'daily' | 'weekly' | 'monthly') {
  const end = endOfDay(new Date());
  if (kind === 'daily') {
    return { start: startOfDay(new Date()), end };
  }
  if (kind === 'weekly') {
    const start = startOfDay(new Date());
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { start, end };
}

export function buildAdminAnalyticsSnapshot(
  orders: AnalyticsOrder[],
  orderItems: AnalyticsOrderItem[],
  smsOrders: AnalyticsSmsOrder[] = [],
  stockInventory: AdminAnalyticsStockItem[] = [],
): AdminAnalyticsSnapshot {
  const countableOrders = orders.filter(isCountableOrder);
  const countableSmsOrders = smsOrders.filter(isCountableSmsOrder);

  const salesByDay = mapTrendBuckets(buildDayBuckets(14), countableOrders, countableSmsOrders);
  const salesByWeek = mapTrendBuckets(buildWeekBuckets(8), countableOrders, countableSmsOrders);
  const salesByMonth = mapTrendBuckets(buildMonthBuckets(6), countableOrders, countableSmsOrders);

  const dailyWindow = currentRangeWindow('daily');
  const weeklyWindow = currentRangeWindow('weekly');
  const monthlyWindow = currentRangeWindow('monthly');

  const rangeTotals: AdminAnalyticsRangeTotals = {
    daily: sumSalesInRange(countableOrders, countableSmsOrders, dailyWindow.start, dailyWindow.end),
    weekly: sumSalesInRange(countableOrders, countableSmsOrders, weeklyWindow.start, weeklyWindow.end),
    monthly: sumSalesInRange(countableOrders, countableSmsOrders, monthlyWindow.start, monthlyWindow.end),
  };

  const countableOrderItems = orderItems.filter((item) => {
    if (!item.order) return true; // legacy rows without join still counted
    return isCountableProductOrder(item.order);
  });

  const platformTotals = new Map<string, number>();
  for (const item of countableOrderItems) {
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
  for (const item of countableOrderItems) {
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

  const sortedStock = [...stockInventory].sort((a, b) => {
    if (a.stock !== b.stock) return a.stock - b.stock;
    return a.title.localeCompare(b.title);
  });

  return {
    revenueByWeek: salesByWeek.slice(-4).map((point) => ({ label: point.label, value: point.revenue })),
    salesByDay,
    salesByWeek,
    salesByMonth,
    rangeTotals,
    platformBreakdown: toPercentageMap(platformTotals),
    topCountries: toPercentageMap(countryTotals),
    orderStatusBreakdown: Array.from(statusCounts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    stockInventory: sortedStock,
    stockSummary: buildStockSummary(sortedStock),
  };
}

export const EMPTY_ADMIN_ANALYTICS: AdminAnalyticsSnapshot = {
  revenueByWeek: buildWeekBuckets(4).map((bucket) => ({ label: bucket.label, value: 0 })),
  salesByDay: buildDayBuckets(14).map((bucket) => ({ label: bucket.label, revenue: 0, orders: 0 })),
  salesByWeek: buildWeekBuckets(8).map((bucket) => ({ label: bucket.label, revenue: 0, orders: 0 })),
  salesByMonth: buildMonthBuckets(6).map((bucket) => ({ label: bucket.label, revenue: 0, orders: 0 })),
  rangeTotals: {
    daily: { revenue: 0, orders: 0 },
    weekly: { revenue: 0, orders: 0 },
    monthly: { revenue: 0, orders: 0 },
  },
  platformBreakdown: [],
  topCountries: [],
  orderStatusBreakdown: [],
  stockInventory: [],
  stockSummary: { inStock: 0, low: 0, out: 0, totalUnits: 0 },
};
