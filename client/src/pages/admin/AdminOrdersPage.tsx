import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { orderService } from '@/services';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/constants';

function getOrderStatusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'warning';
    case 'cancelled':
    case 'refunded':
      return 'outline';
    case 'pending':
    default:
      return 'default';
  }
}

export default function AdminOrdersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: orderService.getAllOrders,
  });

  const getOrderProducts = (order: NonNullable<typeof orders>[number]) => {
    const titles = order.order_items?.map((item) => item.product?.title).filter(Boolean) as string[] | undefined;
    if (!titles?.length) return 'No product details yet';
    return titles.join(', ');
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className={cn('text-xl font-bold sm:text-2xl', isDark ? 'text-slate-50' : 'text-slate-900')}>Orders</h1>
        <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Review buyer names, purchased products, and order status from one clean list.
        </p>
      </div>
      <div className="space-y-3">
        {orders?.map((order) => (
          <Card
            key={order.id}
            className={cn(
              isDark ? 'border-[#18263b] bg-[#0a1527] text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.32)]' : 'border-slate-200 bg-white text-slate-900 shadow-sm'
            )}
          >
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className={cn('font-medium', isDark ? 'text-slate-50' : 'text-slate-900')}>{order.order_number}</p>
                <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                  {order.profile?.full_name || order.profile?.email || 'Unknown user'}
                </p>
                <p className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-500')}>{new Date(order.created_at).toLocaleString()}</p>
                <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-slate-700')}>
                  Bought: {getOrderProducts(order)}
                </p>
                <p className="mt-1 font-bold text-primary">{formatPrice(Number(order.total_amount))}</p>
              </div>
              <div className="flex items-center w-full sm:w-auto sm:justify-end">
                <Badge variant={getOrderStatusVariant(order.status)}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
