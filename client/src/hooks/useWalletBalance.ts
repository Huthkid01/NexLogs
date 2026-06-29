import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { profileService } from '@/services/profile.service';

type WalletBalanceListener = () => void;

const walletRealtime = {
  channel: null as RealtimeChannel | null,
  userId: null as string | null,
  listeners: new Set<WalletBalanceListener>(),
};

function notifyWalletBalanceListeners() {
  walletRealtime.listeners.forEach((listener) => listener());
}

function teardownWalletBalanceChannel() {
  if (!walletRealtime.channel) return;
  void supabase.removeChannel(walletRealtime.channel);
  walletRealtime.channel = null;
  walletRealtime.userId = null;
}

function ensureWalletBalanceChannel(userId: string) {
  if (walletRealtime.channel && walletRealtime.userId === userId) {
    return;
  }

  teardownWalletBalanceChannel();

  try {
    walletRealtime.channel = supabase
      .channel(`wallet-balance-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => notifyWalletBalanceListeners(),
      )
      .subscribe();
    walletRealtime.userId = userId;
  } catch {
    walletRealtime.channel = null;
    walletRealtime.userId = null;
  }
}

function subscribeWalletBalance(userId: string, listener: WalletBalanceListener) {
  ensureWalletBalanceChannel(userId);
  walletRealtime.listeners.add(listener);

  return () => {
    walletRealtime.listeners.delete(listener);
    if (walletRealtime.listeners.size === 0) {
      teardownWalletBalanceChannel();
    }
  };
}

export function useWalletBalance(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wallet-balance', userId],
    queryFn: () => profileService.getStats(userId!),
    enabled: !!userId,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet-balance', userId] });
      void queryClient.invalidateQueries({ queryKey: ['profile-stats', userId] });
    };

    return subscribeWalletBalance(userId, invalidate);
  }, [queryClient, userId]);

  return query;
}
