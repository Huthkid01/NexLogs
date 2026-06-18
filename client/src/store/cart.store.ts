import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  setItems: (items: CartItem[]) => void;
  setCouponCode: (code: string | null) => void;
  itemCount: () => number;
  subtotal: () => number;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      setItems: (items) => set({ items }),
      setCouponCode: (couponCode) => set({ couponCode }),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: () => get().items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0),
      clear: () => set({ items: [], couponCode: null }),
    }),
    { name: 'nexlogs-cart' }
  )
);
