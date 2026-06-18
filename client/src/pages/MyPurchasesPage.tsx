import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PurchaseCard } from '@/components/purchases/PurchaseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/services';

const PAGE_SIZE = 10;

export default function MyPurchasesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: () => orderService.getUserOrders(user!.id),
    enabled: !!user,
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    const query = search.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const title = order.order_items?.[0]?.product?.title?.toLowerCase() ?? '';
      const orderId = order.order_number.toLowerCase();
      return title.includes(query) || orderId.includes(query);
    });
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 dark:text-gray-100 mb-5">
        My Purchases
      </h1>

      <input
        type="search"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search by product name..."
        className="w-full h-11 rounded-md border border-gray-300 dark:border-dm-input-border bg-white dark:bg-dm-surface px-4 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-dm-input-border mb-6"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-[260px] w-full rounded-lg" />
          ))}
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
          <p>No purchases found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {paginatedOrders.map((order) => (
            <PurchaseCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {!isLoading && filteredOrders.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-10">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-dm-input-border rounded-md bg-white dark:bg-dm-surface text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-dm-input"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-dm-input-border rounded-md bg-white dark:bg-dm-surface text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-dm-input"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
