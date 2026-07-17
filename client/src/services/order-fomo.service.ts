import { supabase } from '@/lib/supabase';

export interface PublicOrderFomo {
  event_key: string;
  product_title: string;
  masked_name: string;
}

export const orderFomoService = {
  async getDailyPurchases(): Promise<PublicOrderFomo[]> {
    const { data, error } = await supabase.rpc('get_public_order_fomo_feed');

    if (error) throw error;
    return (data ?? []) as PublicOrderFomo[];
  },
};
