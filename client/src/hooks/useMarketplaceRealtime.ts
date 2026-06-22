import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface MarketplaceRealtimeOptions {
  userId?: string | null;
}

function invalidateCatalogQueries(queryClient: QueryClient, userId?: string | null) {
  void queryClient.invalidateQueries({ queryKey: ['home-products'] });
  void queryClient.invalidateQueries({ queryKey: ['featured-products'] });
  void queryClient.invalidateQueries({ queryKey: ['categories'] });
  void queryClient.invalidateQueries({ queryKey: ['product'] });

  if (userId) {
    void queryClient.invalidateQueries({ queryKey: ['user-orders', userId] });
  }
}

export function useMarketplaceRealtime(options: MarketplaceRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  useEffect(() => {
    const channel = supabase
      .channel('marketplace-catalog-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => invalidateCatalogQueries(queryClient, userId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_images' },
        () => invalidateCatalogQueries(queryClient, userId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => invalidateCatalogQueries(queryClient, userId),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`marketplace-orders-live-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['user-orders', userId] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['user-orders', userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
