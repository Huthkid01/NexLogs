import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { isRdpProduct } from '@/lib/rdp-utils';
import { isTelegramProduct } from '@/lib/telegram-utils';
import { orderService } from '@/services';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/constants';
import type { Order, OrderItem } from '@/types';

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

function OrderItemFulfillment({
  order,
  item,
  isDark,
}: {
  order: Order;
  item: OrderItem;
  isDark: boolean;
}) {
  const queryClient = useQueryClient();
  const [details, setDetails] = useState(item.delivered_details ?? '');
  const isTelegram = isTelegramProduct(item.product);
  const needsRdpFulfillment = isRdpProduct(item.product) && !item.delivered_details?.trim();

  const saveMutation = useMutation({
    mutationFn: () => orderService.updateOrderItemDeliveredDetails(item.id, details, order.id),
    onSuccess: () => {
      toast.success('RDP details saved. Buyer can now view them in My Purchases.');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error('Failed to save RDP details.'),
  });

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        isDark ? 'border-[#243247] bg-[#0f1b2e]' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('text-sm font-medium', isDark ? 'text-slate-100' : 'text-slate-900')}>
          {item.product?.title ?? 'Product'}
        </p>
        {needsRdpFulfillment && <Badge variant="warning">Awaiting RDP details</Badge>}
        {isTelegram && <Badge variant="outline">Telegram support fulfillment</Badge>}
        {item.delivered_details?.trim() && isRdpProduct(item.product) && (
          <Badge variant="success">Details delivered</Badge>
        )}
      </div>

      {isTelegram && (
        <p className={cn('text-sm leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-600')}>
          Buyer receives this order on Telegram. They copy their Order ID from My Purchases and contact support using the floating Telegram button. No in-app details to paste here.
        </p>
      )}

      {isRdpProduct(item.product) && (
        <>
          <label className={cn('block text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Paste RDP details for buyer
          </label>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={8}
            placeholder={'IP: 203.0.113.10\nUsername: admin\nPassword: your-password\nPort: 3389'}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y min-h-[160px]',
              isDark
                ? 'border-[#243247] bg-[#0a1527] text-slate-100 placeholder:text-slate-500'
                : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400',
            )}
          />
          <Button
            type="button"
            size="sm"
            className="bg-[#f26522] hover:bg-[#d94e0f]"
            disabled={saveMutation.isPending || !details.trim()}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save RDP details'
            )}
          </Button>
        </>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: orderService.getAllOrders,
  });

  const getOrderProducts = (order: NonNullable<typeof orders>[number]) => {
    const titles = order.order_items?.map((item) => item.product?.title).filter(Boolean) as string[] | undefined;
    if (!titles?.length) return 'No product details yet';
    return titles.join(', ');
  };

  const orderNeedsRdpFulfillment = (order: Order) =>
    order.order_items?.some((item) => isRdpProduct(item.product) && !item.delivered_details?.trim());

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className={cn('text-xl font-bold sm:text-2xl', isDark ? 'text-slate-50' : 'text-slate-900')}>Orders</h1>
        <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Review purchases and paste RDP credentials for buyers when an RDP order is awaiting fulfillment. Telegram orders are fulfilled via support on Telegram.
        </p>
      </div>
      <div className="space-y-3">
        {orders?.map((order) => {
          const expanded = expandedOrderId === order.id;
          const pendingRdp = orderNeedsRdpFulfillment(order);

          return (
            <Card
              key={order.id}
              className={cn(
                isDark
                  ? 'border-[#18263b] bg-[#0a1527] text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.32)]'
                  : 'border-slate-200 bg-white text-slate-900 shadow-sm',
              )}
            >
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className={cn('font-medium', isDark ? 'text-slate-50' : 'text-slate-900')}>{order.order_number}</p>
                    <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                      {order.profile?.full_name || order.profile?.email || 'Unknown user'}
                    </p>
                    <p className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-500')}>
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-slate-700')}>
                      Bought: {getOrderProducts(order)}
                    </p>
                    <p className="mt-1 font-bold text-primary">{formatPrice(Number(order.total_amount))}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
                    {pendingRdp && <Badge variant="warning">RDP pending</Badge>}
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                    >
                      {expanded ? (
                        <>
                          Hide details
                          <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Manage items
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3 pt-2 border-t border-dashed border-slate-200 dark:border-[#243247]">
                    {order.order_items?.map((item) => (
                      <OrderItemFulfillment key={item.id} order={order} item={item} isDark={isDark} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
