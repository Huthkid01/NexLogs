import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/useTheme';
import { adminMutedTextClass, adminSubtleTextClass } from '@/lib/admin-theme';
import { cn, formatPrice } from '@/lib/utils';
import { isRdpProduct } from '@/lib/rdp-utils';
import { isTelegramProduct } from '@/lib/telegram-utils';
import { orderService } from '@/services';
import { ORDER_STATUS_LABELS } from '@/constants';
import type { Order, OrderItem } from '@/types';

const PAGE_SIZE = 10;

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
  const isRdp = isRdpProduct(item.product);
  const needsManualFulfillment = (isRdp || isTelegram) && !item.delivered_details?.trim();
  const fulfillmentLabel = isTelegram ? 'Telegram' : 'RDP';

  const saveMutation = useMutation({
    mutationFn: () => orderService.updateOrderItemDeliveredDetails(item.id, details, order.id),
    onSuccess: () => {
      toast.success(`${fulfillmentLabel} details saved. Buyer will be emailed to check My Purchases.`);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error(`Failed to save ${fulfillmentLabel} details.`),
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
        {needsManualFulfillment && <Badge variant="warning">Awaiting {fulfillmentLabel} details</Badge>}
        {isTelegram && <Badge variant="outline">Telegram fulfillment</Badge>}
        {item.delivered_details?.trim() && (isRdp || isTelegram) && (
          <Badge variant="success">Details delivered</Badge>
        )}
      </div>

      {(isRdp || isTelegram) && (
        <>
          <label className={cn('block text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Paste {fulfillmentLabel} details for buyer
          </label>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={8}
            placeholder={
              isTelegram
                ? 'Paste the Telegram account or channel details the buyer should receive.'
                : 'IP: 203.0.113.10\nUsername: admin\nPassword: your-password\nPort: 3389'
            }
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
              `Save ${fulfillmentLabel} details`
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: orderService.getAllOrders,
  });

  const getOrderProducts = (order: Order) => {
    const titles = order.order_items?.map((item) => item.product?.title).filter(Boolean) as string[] | undefined;
    if (!titles?.length) return 'No product details yet';
    return titles.join(', ');
  };

  const orderNeedsManualFulfillment = (order: Order) =>
    order.order_items?.some((item) => {
      const needsDetails = isRdpProduct(item.product) || isTelegramProduct(item.product);
      return needsDetails && !item.delivered_details?.trim();
    });

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;

    return orders.filter((order) => {
      const buyer = `${order.profile?.full_name ?? ''} ${order.profile?.email ?? ''}`.toLowerCase();
      const products = getOrderProducts(order).toLowerCase();
      return (
        order.order_number.toLowerCase().includes(term)
        || buyer.includes(term)
        || products.includes(term)
        || order.status.toLowerCase().includes(term)
      );
    });
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const pageStart = filteredOrders.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredOrders.length);

  const pageButtonClass = (active: boolean) =>
    cn(
      'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors',
      active
        ? 'border-[#f26522] bg-[#f26522] text-white'
        : isDark
          ? 'border-[#22324a] bg-[#0b1628] text-slate-200 hover:bg-[#10213a]'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
    );

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
          Review all purchases and paste RDP or Telegram credentials for buyers. They receive an email when details are ready in My Purchases.
        </p>
      </div>

      <Card
        className={cn(
          isDark
            ? 'border-[#18263b] bg-[#0a1527] text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.32)]'
            : 'border-slate-200 bg-white text-slate-900 shadow-sm',
        )}
      >
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-800')}>
              {orders.length} total order{orders.length === 1 ? '' : 's'}
              {search.trim() ? ` · ${filteredOrders.length} match${filteredOrders.length === 1 ? '' : 'es'}` : ''}
            </p>
            <div className="relative w-full sm:max-w-sm">
              <Search className={cn('absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', isDark ? 'text-slate-500' : 'text-slate-400')} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order #, buyer, product, status…"
                className={cn(
                  'h-10 pl-9',
                  isDark
                    ? 'border-[#22324a] bg-[#06101d] text-slate-100 placeholder:text-slate-500'
                    : 'border-slate-200 bg-white text-slate-900',
                )}
              />
            </div>
          </div>

          {pagedOrders.length === 0 ? (
            <p className={cn('py-10 text-center text-sm', adminMutedTextClass(isDark))}>
              {search.trim() ? 'No orders match your search.' : 'No orders yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {pagedOrders.map((order) => {
                const expanded = expandedOrderId === order.id;
                const pendingFulfillment = orderNeedsManualFulfillment(order);

                return (
                  <Card
                    key={order.id}
                    className={cn(
                      isDark
                        ? 'border-[#18263b] bg-[#06111f] text-slate-100'
                        : 'border-slate-200 bg-slate-50 text-slate-900',
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
                          {pendingFulfillment && <Badge variant="warning">Fulfillment pending</Badge>}
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
          )}

          <div
            className={cn(
              'flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between',
              isDark ? 'border-[#18263b]' : 'border-slate-200',
            )}
          >
            <p className={cn('text-sm', adminMutedTextClass(isDark))}>
              Showing {pageStart} to {pageEnd} of {filteredOrders.length} results
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={cn(pageButtonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((pageNumber) => {
                  if (totalPages <= 7) return true;
                  if (pageNumber === 1 || pageNumber === totalPages) return true;
                  return Math.abs(pageNumber - currentPage) <= 1;
                })
                .map((pageNumber, index, visiblePages) => {
                  const previous = visiblePages[index - 1];
                  const showEllipsis = previous != null && pageNumber - previous > 1;
                  return (
                    <span key={pageNumber} className="contents">
                      {showEllipsis ? (
                        <span className={cn('px-1 text-sm', adminSubtleTextClass(isDark))}>…</span>
                      ) : null}
                      <button
                        type="button"
                        className={pageButtonClass(pageNumber === currentPage)}
                        onClick={() => setPage(pageNumber)}
                        aria-label={`Page ${pageNumber}`}
                        aria-current={pageNumber === currentPage ? 'page' : undefined}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
              <button
                type="button"
                className={cn(pageButtonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
