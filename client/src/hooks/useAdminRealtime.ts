import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface AdminRealtimeOptions {
  userId?: string | null;
}

function invalidateAdminCatalog(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
  void queryClient.invalidateQueries({ queryKey: ['home-products'] });
  void queryClient.invalidateQueries({ queryKey: ['featured-products'] });
  void queryClient.invalidateQueries({ queryKey: ['categories'] });
  void queryClient.invalidateQueries({ queryKey: ['product'] });
}

function invalidateAdminOrders(queryClient: QueryClient, userId?: string | null) {
  void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: ['user-orders', userId] });
  }
}

function invalidateAdminUsers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
}

function invalidateAdminVisitors(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-recent-visits'] });
}

function invalidateAdminTickets(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
}

function invalidateAdminCoupons(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
}

function invalidateAdminActivity(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['admin-activity-logs'] });
}

export function useAdminRealtime(options: AdminRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => invalidateAdminCatalog(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_images' },
        () => invalidateAdminCatalog(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => invalidateAdminCatalog(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => invalidateAdminOrders(queryClient, userId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => invalidateAdminOrders(queryClient, userId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => invalidateAdminUsers(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_sessions' },
        () => invalidateAdminVisitors(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_page_views' },
        () => invalidateAdminVisitors(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => invalidateAdminTickets(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        () => invalidateAdminActivity(queryClient),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupons' },
        () => invalidateAdminCoupons(queryClient),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
