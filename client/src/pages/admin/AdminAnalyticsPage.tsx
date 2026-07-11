import { useQuery } from '@tanstack/react-query';
import { BarChart3, Globe2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { adminService } from '@/services';

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminService.getAnalytics,
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const peakRevenue = Math.max(...(data?.revenueByWeek.map((item) => item.value) ?? [0]), 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Live overview of sales, revenue, and activity from marketplace orders and SMS verification.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Peak Weekly Revenue</p>
              <p className="text-2xl font-bold">{formatPrice(peakRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <BarChart3 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Tracked Platforms</p>
              <p className="text-2xl font-bold">{data?.platformBreakdown.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Globe2 className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Top Countries</p>
              <p className="text-2xl font-bold">{data?.topCountries.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Revenue by Week</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data?.revenueByWeek.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{formatPrice(item.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${peakRevenue > 0 ? (item.value / peakRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Platform Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data?.platformBreakdown.length ? (
              data.platformBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3 text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No paid orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Countries</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data?.topCountries.length ? (
              data.topCountries.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3 text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No country data from orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Order Status Mix</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data?.orderStatusBreakdown.length ? (
              data.orderStatusBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3 text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
