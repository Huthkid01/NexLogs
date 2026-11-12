import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArcElement,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  Tooltip,
  type Chart,
} from 'chart.js';
import {
  AlertTriangle,
  BarChart3,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminListPagination } from '@/hooks/useAdminListPagination';
import { useTheme } from '@/hooks/useTheme';
import { adminService } from '@/services';
import { cn, formatPrice } from '@/lib/utils';
import type { AdminAnalyticsSnapshot, AdminAnalyticsTrendPoint } from '@/types';
import { toast } from 'sonner';

ChartJS.register(ArcElement, DoughnutController, Legend, Tooltip);

type SalesRange = 'daily' | 'weekly' | 'monthly';
type StockFilter = 'all' | 'in_stock' | 'low' | 'out';

const RANGE_LABELS: Record<SalesRange, string> = {
  daily: 'Today',
  weekly: 'Last 7 days',
  monthly: 'This month',
};

const DONUT_COLORS = ['#f26522', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#94a3b8', '#a855f7'];

function stockLevel(stock: number): 'in_stock' | 'low' | 'out' {
  if (stock <= 0) return 'out';
  if (stock <= 5) return 'low';
  return 'in_stock';
}

function AnalyticsDonut({
  segments,
  centerValue,
  centerLabel,
  isDark,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerValue: string | number;
  centerLabel: string;
  isDark: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'doughnut'> | null>(null);
  const activeSegments = useMemo(
    () => segments.filter((item) => item.value > 0),
    [segments],
  );
  const chartKey = useMemo(
    () => activeSegments.map((item) => `${item.label}:${item.value}:${item.color}`).join('|'),
    [activeSegments],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    chartRef.current?.destroy();
    chartRef.current = null;

    if (!activeSegments.length) return;

    chartRef.current = new ChartJS(canvas, {
      type: 'doughnut',
      data: {
        labels: activeSegments.map((item) => item.label),
        datasets: [
          {
            data: activeSegments.map((item) => item.value),
            backgroundColor: activeSegments.map((item) => item.color),
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1100,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label(context) {
                const label = context.label ?? '';
                const value = context.parsed;
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [activeSegments, chartKey, isDark]);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div className="relative h-44 w-44 shrink-0">
        {activeSegments.length ? (
          <canvas ref={canvasRef} aria-label={`${centerLabel} chart`} />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center rounded-full border',
              isDark ? 'border-[#22324a] bg-[#081624]' : 'border-slate-200 bg-slate-50',
            )}
          />
        )}
        <div
          className={cn(
            'pointer-events-none absolute inset-[22%] flex flex-col items-center justify-center rounded-full text-center',
            isDark ? 'bg-[#0b1628]' : 'bg-white',
          )}
        >
          <strong className="text-2xl font-semibold tabular-nums">{centerValue}</strong>
          <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {segments.length ? (
          segments.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="font-semibold tabular-nums">{item.value}</span>
            </li>
          ))
        ) : (
          <li className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>No data yet.</li>
        )}
      </ul>
    </div>
  );
}

function SalesTrendBars({
  points,
  isDark,
}: {
  points: AdminAnalyticsTrendPoint[];
  isDark: boolean;
}) {
  const peak = Math.max(...points.map((point) => point.revenue), 0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [points]);

  return (
    <div className="space-y-3">
      {points.map((point, index) => (
        <div key={point.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className={cn('truncate', isDark ? 'text-slate-300' : 'text-slate-700')}>{point.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatPrice(point.revenue)}
              <span className={cn('ml-2 text-xs font-normal', isDark ? 'text-slate-500' : 'text-slate-500')}>
                {point.orders} order{point.orders === 1 ? '' : 's'}
              </span>
            </span>
          </div>
          <div className={cn('h-2 overflow-hidden rounded-full', isDark ? 'bg-[#132038]' : 'bg-slate-100')}>
            <div
              className="h-2 rounded-full bg-[#f26522] transition-[width] duration-700 ease-out"
              style={{
                width: ready ? `${peak > 0 ? (point.revenue / peak) * 100 : 0}%` : '0%',
                transitionDelay: `${Math.min(index, 10) * 40}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [range, setRange] = useState<SalesRange>('weekly');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [stockSearch, setStockSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminService.getAnalytics,
  });

  const snapshot: AdminAnalyticsSnapshot | undefined = data;

  const trendPoints = useMemo(() => {
    if (!snapshot) return [];
    if (range === 'daily') return snapshot.salesByDay;
    if (range === 'monthly') return snapshot.salesByMonth;
    return snapshot.salesByWeek;
  }, [range, snapshot]);

  const rangeTotals = snapshot?.rangeTotals[range] ?? { revenue: 0, orders: 0 };
  const avgOrder = rangeTotals.orders > 0 ? rangeTotals.revenue / rangeTotals.orders : 0;

  const orderSegments = useMemo(() => {
    return (snapshot?.orderStatusBreakdown ?? []).map((item, index) => ({
      label: item.label,
      value: item.value,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));
  }, [snapshot?.orderStatusBreakdown]);

  const stockSegments = useMemo(() => {
    const summary = snapshot?.stockSummary;
    if (!summary) return [];
    return [
      { label: 'In stock', value: summary.inStock, color: '#22c55e' },
      { label: 'Low (1–5)', value: summary.low, color: '#eab308' },
      { label: 'Out of stock', value: summary.out, color: '#ef4444' },
    ];
  }, [snapshot?.stockSummary]);

  const filteredStock = useMemo(() => {
    const rows = snapshot?.stockInventory ?? [];
    const query = stockSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const level = stockLevel(row.stock);
      if (stockFilter !== 'all' && level !== stockFilter) return false;
      if (!query) return true;
      return (
        row.title.toLowerCase().includes(query)
        || row.platform.toLowerCase().includes(query)
        || (row.category ?? '').toLowerCase().includes(query)
        || row.slug.toLowerCase().includes(query)
      );
    });
  }, [snapshot?.stockInventory, stockFilter, stockSearch]);

  const {
    page: stockPage,
    setPage: setStockPage,
    totalPages: stockTotalPages,
    totalItems: stockTotalItems,
    pageStart: stockPageStart,
    pageEnd: stockPageEnd,
    paginatedItems: pagedStock,
  } = useAdminListPagination(filteredStock, {
    resetKey: `${stockFilter}:${stockSearch}`,
  });

  const cardClass = cn(
    'rounded-2xl',
    isDark ? 'border-[#18263b] bg-[#0b1628] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
  );

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      await refetch();
      toast.success('Analytics refreshed');
    } catch {
      toast.error('Could not refresh analytics');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: `${RANGE_LABELS[range]} sales`,
      value: formatPrice(rangeTotals.revenue),
      icon: TrendingUp,
      iconClass: 'bg-orange-500/15 text-orange-300',
    },
    {
      label: `${RANGE_LABELS[range]} orders`,
      value: rangeTotals.orders,
      icon: ShoppingBag,
      iconClass: 'bg-blue-500/15 text-blue-300',
    },
    {
      label: 'Avg order value',
      value: formatPrice(avgOrder),
      icon: Wallet,
      iconClass: 'bg-emerald-500/15 text-emerald-300',
    },
    {
      label: 'In stock SKUs',
      value: snapshot?.stockSummary.inStock ?? 0,
      icon: Package,
      iconClass: 'bg-green-500/15 text-green-300',
    },
    {
      label: 'Low stock',
      value: snapshot?.stockSummary.low ?? 0,
      icon: AlertTriangle,
      iconClass: 'bg-amber-500/15 text-amber-300',
    },
    {
      label: 'Out of stock',
      value: snapshot?.stockSummary.out ?? 0,
      icon: BarChart3,
      iconClass: 'bg-red-500/15 text-red-300',
    },
  ];

  return (
    <div className={cn('space-y-8', isDark ? 'text-slate-100' : 'text-slate-900')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Analytics</h1>
          <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Daily, weekly, and monthly sales plus live stock across the marketplace.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={cn(
              'inline-flex rounded-xl border p-1',
              isDark ? 'border-[#22324a] bg-[#081624]' : 'border-slate-200 bg-slate-50',
            )}
          >
            {(['daily', 'weekly', 'monthly'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  range === option
                    ? 'bg-[#f26522] text-white'
                    : isDark
                      ? 'text-slate-300 hover:bg-[#10213a]'
                      : 'text-slate-600 hover:bg-white',
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className={cn(
              isDark
                ? 'border-[#22324a] bg-[#081624] text-slate-100 hover:bg-[#10213a]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
            )}
            onClick={() => void handleRefresh()}
            loading={isFetching}
          >
            {!isFetching && <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpiCards.map((card) => (
          <Card key={card.label} className={cardClass}>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>{card.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Order performance</CardTitle>
            <Badge variant="secondary">All time</Badge>
          </CardHeader>
          <CardContent>
            <AnalyticsDonut
              segments={orderSegments}
              centerValue={orderSegments.reduce((sum, item) => sum + item.value, 0)}
              centerLabel="Orders"
              isDark={isDark}
            />
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Stock health</CardTitle>
            <Badge variant="secondary">{snapshot?.stockSummary.totalUnits ?? 0} units</Badge>
          </CardHeader>
          <CardContent>
            <AnalyticsDonut
              segments={stockSegments}
              centerValue={(snapshot?.stockInventory.length ?? 0)}
              centerLabel="SKUs"
              isDark={isDark}
            />
            <p className={cn('mt-4 text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
              Low stock means 1–5 remaining. Out of stock is 0.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className={cardClass}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">
            {range === 'daily' ? 'Daily' : range === 'monthly' ? 'Monthly' : 'Weekly'} sales trend
          </CardTitle>
          <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
            {range === 'daily' ? 'Last 14 days' : range === 'monthly' ? 'Last 6 months' : 'Last 8 weeks'}
          </span>
        </CardHeader>
        <CardContent>
          {trendPoints.some((point) => point.revenue > 0 || point.orders > 0) ? (
            <SalesTrendBars points={trendPoints} isDark={isDark} />
          ) : (
            <p className={cn('py-8 text-center text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
              No paid sales in this window yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className={cardClass}>
          <CardHeader><CardTitle className="text-base font-semibold">Platform mix</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot?.platformBreakdown.length ? (
              snapshot.platformBreakdown.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3 text-sm',
                    isDark ? 'bg-[#081624]' : 'bg-slate-50',
                  )}
                >
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))
            ) : (
              <p className={cn('py-4 text-center text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                No paid orders yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader><CardTitle className="text-base font-semibold">Top countries</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot?.topCountries.length ? (
              snapshot.topCountries.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3 text-sm',
                    isDark ? 'bg-[#081624]' : 'bg-slate-50',
                  )}
                >
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))
            ) : (
              <p className={cn('py-4 text-center text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                No country data from orders yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cardClass}>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">All stock</CardTitle>
              <p className={cn('mt-1 text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {filteredStock.length} of {snapshot?.stockInventory.length ?? 0} products
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/products">Manage products</Link>
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={stockSearch}
              onChange={(event) => setStockSearch(event.target.value)}
              placeholder="Search products, platform, category…"
              className={cn(
                'sm:max-w-sm',
                isDark ? 'border-[#22324a] bg-[#081624]' : undefined,
              )}
            />
            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value as StockFilter)}
              className={cn(
                'h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-[#f26522]',
                isDark ? 'border-[#22324a] bg-[#081624] text-slate-100' : 'border-slate-200 bg-white text-slate-900',
              )}
              aria-label="Filter stock level"
            >
              <option value="all">All stock</option>
              <option value="in_stock">In stock</option>
              <option value="low">Low (1–5)</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          {pagedStock.length ? (
            <>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className={cn('border-b text-xs uppercase tracking-wide', isDark ? 'border-[#1c2b40] text-slate-500' : 'border-slate-200 text-slate-500')}>
                    <th className="pb-3 pr-3 font-medium">Product</th>
                    <th className="pb-3 pr-3 font-medium">Category</th>
                    <th className="pb-3 pr-3 font-medium">Platform</th>
                    <th className="pb-3 pr-3 font-medium">Stock</th>
                    <th className="pb-3 pr-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStock.map((row) => {
                    const level = stockLevel(row.stock);
                    return (
                      <tr
                        key={row.id}
                        className={cn('border-b last:border-0', isDark ? 'border-[#132038]' : 'border-slate-100')}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-medium">{row.title}</div>
                          <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>{row.slug}</div>
                        </td>
                        <td className="py-3 pr-3">{row.category || '—'}</td>
                        <td className="py-3 pr-3 capitalize">{row.platform}</td>
                        <td className="py-3 pr-3 font-semibold tabular-nums">{row.stock}</td>
                        <td className="py-3 pr-3">
                          <Badge
                            variant="secondary"
                            className={cn(
                              level === 'out' && 'bg-red-500/15 text-red-300',
                              level === 'low' && 'bg-amber-500/15 text-amber-300',
                              level === 'in_stock' && 'bg-emerald-500/15 text-emerald-300',
                            )}
                          >
                            {level === 'out' ? 'Out' : level === 'low' ? 'Low' : 'In stock'}
                            {!row.is_active ? ' · Hidden' : ''}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs tabular-nums">
                          {new Date(row.updated_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <AdminListPagination
                page={stockPage}
                totalPages={stockTotalPages}
                totalItems={stockTotalItems}
                pageStart={stockPageStart}
                pageEnd={stockPageEnd}
                onPageChange={setStockPage}
                isDark={isDark}
              />
            </>
          ) : (
            <p className={cn('py-8 text-center text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
              No products match this stock filter.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
