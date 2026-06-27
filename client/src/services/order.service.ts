import { supabase } from '@/lib/supabase';
import type { Order, Coupon } from '@/types';

export const orderService = {
  async purchaseWithWallet(productId: string, quantity = 1): Promise<string> {
    const { data, error } = await supabase.rpc('purchase_product_with_wallet', {
      p_product_id: productId,
      p_quantity: quantity,
    } as never);
    if (error) throw error;
    return data as string;
  },

  async purchaseRdpWithWallet(productId: string, quantity = 1): Promise<string> {
    const { data, error } = await supabase.rpc('purchase_rdp_with_wallet', {
      p_product_id: productId,
      p_quantity: quantity,
    } as never);
    if (error) throw error;
    return data as string;
  },

  async purchaseRdpBySlug(productSlug: string, quantity = 1): Promise<string> {
    const { data, error } = await supabase.rpc('purchase_rdp_with_wallet_by_slug', {
      p_product_slug: productSlug,
      p_quantity: quantity,
    } as never);
    if (error) throw error;
    return data as string;
  },

  async updateOrderItemDeliveredDetails(
    orderItemId: string,
    deliveredDetails: string,
    orderId: string,
  ): Promise<void> {
    const trimmed = deliveredDetails.trim();
    const { error: itemError } = await supabase
      .from('order_items')
      .update({ delivered_details: trimmed || null } as never)
      .eq('id', orderItemId);
    if (itemError) throw itemError;

    if (trimmed) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'completed' } as never)
        .eq('id', orderId);
      if (orderError) throw orderError;

      const order = await this.getOrderById(orderId);
      if (order?.user_id) {
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: 'RDP Details Ready',
          message: 'Your RDP details are now available in My Purchases.',
          link: '/purchases',
        } as never);
      }
    }
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(*, product_images(*)))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Order[];
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(*, product_images(*)))')
      .eq('id', orderId)
      .single();
    if (error) return null;
    return data as Order;
  },

  async getAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(title, slug)), profile:profiles(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Order[];
  },

  async updateOrderStatus(orderId: string, status: string, paymentStatus?: string) {
    const updates: Record<string, string> = { status };
    if (paymentStatus) updates.payment_status = paymentStatus;
    const { data, error } = await supabase.from('orders').update(updates as never).eq('id', orderId).select().single();
    if (error) throw error;
    return data as Order;
  },

  async validateCoupon(code: string, subtotal: number): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();
    if (error || !data) return null;
    const coupon = data as Coupon;
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) return null;
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return null;
    if (coupon.min_purchase && subtotal < coupon.min_purchase) return null;
    return coupon;
  },
};
