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

    const rows = (data ?? []) as PublicOrderFomo[];
    // Shuffle per fetch so visitors don't all see the same rotation order.
    for (let i = rows.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return rows;
  },
};
