import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface MarketplaceRealtimeOptions {
  userId?: string | null;
  includeAdmin?: boolean;
}

function invalidateCatalogQueries(queryClient: QueryClient, options?: MarketplaceRealtimeOptions) {
  void queryClient.invalidateQueries({ queryKey: ['home-products'] });
  void queryClient.invalidateQueries({ queryKey: ['featured-products'] });
  void queryClient.invalidateQueries({ queryKey: ['categories'] });
  void queryClient.invalidateQueries({ queryKey: ['product'] });

  if (options?.userId) {
    void queryClient.invalidateQueries({ queryKey: ['user-orders', options.userId] });
  }

  if (options?.includeAdmin) {
    void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  }
}

export function useMarketplaceRealtime(options: MarketplaceRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const { userId, includeAdmin } = options;

  useEffect(() => {
    const channel = supabase
      .channel('marketplace-catalog-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => invalidateCatalogQueries(queryClient, { userId, includeAdmin }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_images' },
        () => invalidateCatalogQueries(queryClient, { userId, includeAdmin }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => invalidateCatalogQueries(queryClient, { userId, includeAdmin }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId, includeAdmin]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`marketplace-orders-live-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['user-orders', userId] });
          if (includeAdmin) {
            void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['user-orders', userId] });
          if (includeAdmin) {
            void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId, includeAdmin]);
}
