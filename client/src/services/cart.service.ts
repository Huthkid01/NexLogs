import { supabase } from '@/lib/supabase';
import { isMockMode } from '@/lib/mock-mode';
import { mockAdminService } from '@/mocks/mock-admin';
import { getMockUserOrders } from '@/mocks/mock-orders';
import type { Cart, CartItem, Order, Coupon } from '@/types';

export const cartService = {
  async getCart(userId: string): Promise<Cart | null> {
    const { data, error } = await supabase
      .from('carts')
      .select('*, cart_items(*, product:products(*, product_images(*)))')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data as Cart;
  },

  async addItem(userId: string, productId: string, quantity = 1) {
    let cart = await this.getCart(userId);
    if (!cart) {
      const { data, error } = await supabase.from('carts').insert({ user_id: userId } as never).select().single();
      if (error) throw error;
      cart = data as Cart;
    }

    const existing = cart.cart_items?.find((item: CartItem) => item.product_id === productId);
    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity } as never)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cart.id, product_id: productId, quantity } as never);
      if (error) throw error;
    }
    return this.getCart(userId);
  },

  async updateQuantity(cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('cart_items').update({ quantity } as never).eq('id', cartItemId);
      if (error) throw error;
    }
  },

  async removeItem(cartItemId: string) {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
    if (error) throw error;
  },

  async clearCart(cartId: string) {
    const { error } = await supabase.from('cart_items').delete().eq('cart_id', cartId);
    if (error) throw error;
  },
};

export const orderService = {
  async purchaseWithWallet(productId: string, quantity = 1): Promise<string> {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return `order-${crypto.randomUUID()}`;
    }
    const { data, error } = await supabase.rpc('purchase_product_with_wallet', {
      p_product_id: productId,
      p_quantity: quantity,
    } as never);
    if (error) throw error;
    return data as string;
  },

  async purchaseRdpWithWallet(productId: string, quantity = 1): Promise<string> {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return `order-${crypto.randomUUID()}`;
    }
    const { data, error } = await supabase.rpc('purchase_rdp_with_wallet', {
      p_product_id: productId,
      p_quantity: quantity,
    } as never);
    if (error) throw error;
    return data as string;
  },

  async purchaseRdpBySlug(productSlug: string, quantity = 1): Promise<string> {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return `order-${crypto.randomUUID()}`;
    }
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
    if (isMockMode()) return;

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

  async createOrder(userId: string, items: CartItem[], couponCode?: string): Promise<Order> {
    let discountAmount = 0;
    let couponId: string | null = null;

    const subtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

    if (couponCode) {
      const coupon = await this.validateCoupon(couponCode, subtotal);
      if (coupon) {
        couponId = coupon.id;
        discountAmount = coupon.discount_type === 'percentage'
          ? subtotal * (coupon.discount / 100)
          : coupon.discount;
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        coupon_id: couponId,
        status: 'pending',
        payment_status: 'pending',
      } as never)
      .select()
      .single();
    if (orderError) throw orderError;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems as never);
    if (itemsError) throw itemsError;

    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Order Placed',
      message: `Your order has been placed successfully.`,
      link: `/profile`,
    } as never);

    return order as Order;
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    if (isMockMode()) return getMockUserOrders(userId);

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
    if (isMockMode()) return mockAdminService.getOrders();
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(title, slug)), profile:profiles(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Order[];
  },

  async updateOrderStatus(orderId: string, status: string, paymentStatus?: string) {
    if (isMockMode()) return mockAdminService.updateOrderStatus(orderId, status);
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
