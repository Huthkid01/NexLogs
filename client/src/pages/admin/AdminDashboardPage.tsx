import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign, FolderKanban, LifeBuoy, Mail, Package, RefreshCw, Settings, ShoppingBag, Trash2, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { useTheme } from '@/hooks/useTheme';
import { adminService } from '@/services';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/constants';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [clearOrdersOpen, setClearOrdersOpen] = useState(false);
  const { data: stats, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getStats,
  });

  const clearOrders = useMutation({
    mutationFn: adminService.clearOrderHistory,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setClearOrdersOpen(false);
      toast.success(
        result.deleted_orders > 0
          ? `Cleared ${result.deleted_orders} orders and reset revenue`
          : 'Order history is already empty',
      );
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to clear orders';
      toast.error(message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total users', value: stats?.totalUsers || 0, icon: Users, iconClass: 'bg-blue-500/15 text-blue-300' },
    { label: 'Total orders', value: stats?.totalOrders || 0, icon: ShoppingBag, iconClass: 'bg-orange-500/15 text-orange-300' },
    { label: 'Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, iconClass: 'bg-emerald-500/15 text-emerald-300' },
    { label: 'Products', value: stats?.totalProducts || 0, icon: Package, iconClass: 'bg-amber-500/15 text-amber-200' },
    { label: 'Open tickets', value: stats?.openTickets || 0, icon: LifeBuoy, iconClass: 'bg-rose-500/15 text-rose-300' },
  ];

  const quickLinks = [
    { title: 'Manage Products', description: 'Add inventory, edit pricing, and control visibility.', href: '/admin/products', icon: Package },
    { title: 'Manage Categories', description: 'Create category groups and organize the marketplace.', href: '/admin/categories', icon: FolderKanban },
    { title: 'Wallet Transactions', description: 'Kora add-funds payments and recovered deposits when balance did not update.', href: '/admin/transactions', icon: Wallet },
    { title: 'Email Sender', description: 'Notify all users when new products are added to the marketplace.', href: '/admin/sender', icon: Mail },
    { title: 'Support Tickets', description: 'Review user-reported website errors and issue reports.', href: '/admin/tickets', icon: LifeBuoy },
    { title: 'Site Content', description: 'Update public website copy and supporting sections.', href: '/admin/content', icon: Settings },
  ];

  const getOrderProducts = (order: NonNullable<typeof stats>['recentOrders'][number]) => {
    const titles = order.order_items?.map((item) => item.product?.title).filter(Boolean) as string[] | undefined;
    if (!titles?.length) return 'No product details yet';
    return titles.join(', ');
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
        refetch(),
      ]);
      const now = new Date();
      setLastRefreshedAt(now);
      toast.success(`Dashboard refreshed at ${now.toLocaleTimeString()}`);
    } catch {
      toast.error('Failed to refresh dashboard');
    }
  };

  return (
    <div className={cn('space-y-8', isDark ? 'text-slate-100' : 'text-slate-900')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Dashboard overview</h1>
          <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Manage products, categories, orders, and public content from one place.
          </p>
          {lastRefreshedAt && (
            <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
              Last refreshed: {lastRefreshedAt.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className={cn(
              isDark ? 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            )}
            onClick={() => setClearOrdersOpen(true)}
            disabled={!stats?.totalOrders}
          >
            <Trash2 className="h-4 w-4" />
            Clear orders
          </Button>
          <Button
            variant="outline"
            className={cn(
              isDark ? 'border-[#22324a] bg-[#081624] text-slate-100 hover:bg-[#10213a]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            )}
            onClick={() => void handleRefresh()}
            loading={isFetching}
          >
            {!isFetching && <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={cn(
              'rounded-2xl',
              isDark ? 'border-[#18263b] bg-[#0b1628] text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.32)]' : 'border-slate-200 bg-white text-slate-900 shadow-sm'
            )}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.iconClass}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>{s.label}</p>
                <p className={cn('text-2xl font-semibold', isDark ? 'text-slate-50' : 'text-slate-900')}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card
          className={cn(
            'rounded-2xl',
            isDark ? 'border-[#18263b] bg-[#0a1527] text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.32)]' : 'border-slate-200 bg-white text-slate-900 shadow-sm'
          )}
        >
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="admin-heading text-2xl font-semibold">Website management</h2>
                <p className={cn('mt-1 text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                  Quick shortcuts for the parts of the dashboard you edit most.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'block rounded-2xl border p-4 transition-colors',
                    isDark ? 'border-[#18263b] bg-[#06111f] hover:bg-[#0b1a30]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn('font-medium', isDark ? 'text-slate-50' : 'text-slate-900')}>{item.title}</p>
                        <p className={cn('mt-1 text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>{item.description}</p>
                      </div>
                    </div>
                    <ArrowRight className={cn('mt-1 h-4 w-4', isDark ? 'text-slate-500' : 'text-slate-400')} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'rounded-2xl',
            isDark ? 'border-[#18263b] bg-[#0a1527] text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.32)]' : 'border-slate-200 bg-white text-slate-900 shadow-sm'
          )}
        >
          <CardContent className="p-6">
            <div className="mb-5">
              <h2 className="admin-heading text-2xl font-semibold">Recent Orders</h2>
              <p className={cn('mt-1 text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                Latest orders from your marketplace.
              </p>
            </div>
          {stats?.recentOrders?.length ? (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    'rounded-2xl border p-4 transition-colors',
                    isDark ? 'border-[#18263b] bg-[#06111f] hover:bg-[#0b1a30]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={cn('font-medium', isDark ? 'text-slate-50' : 'text-slate-900')}>{order.order_number}</p>
                      <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                        {order.profile?.full_name || order.profile?.email || 'Unknown user'}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <p className={cn('mt-2 text-sm', isDark ? 'text-slate-300' : 'text-slate-700')}>
                        Bought: {getOrderProducts(order)}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className={cn('font-medium', isDark ? 'text-slate-50' : 'text-slate-900')}>{formatPrice(Number(order.total_amount))}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-2',
                          isDark ? 'border-[#26354c] bg-[#0e1c30] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                        )}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={cn('py-8 text-center', isDark ? 'text-slate-400' : 'text-slate-600')}>No orders yet</p>
          )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmModal
        open={clearOrdersOpen}
        title="Clear order history"
        message="Delete all orders and reset dashboard revenue? This cannot be undone. User wallets and products are not affected."
        confirmLabel="Clear all orders"
        loading={clearOrders.isPending}
        onClose={() => {
          if (!clearOrders.isPending) setClearOrdersOpen(false);
        }}
        onConfirm={() => clearOrders.mutate()}
      />
    </div>
  );
}
