import type { Order } from '@/types';
import { MOCK_PRODUCTS } from '@/mocks/demo-data';

const MOCK_ORDER_IDS = [
  '6a05cee293a4807023054c70',
  '6a13ddf02cb21a5d189e9eb6',
  '6a21ccf13db32b6e298fafc7',
  '6a2fbbf24ec43c7f3a90b0d8',
  '6a3daa035fd54d804b81c1e9',
  '6a4b991460e65e915c92d2fa',
  '6a5c880571f76fa26da3e30b',
  '6a6d7766820860b37eb4f41c',
  '6a7e6677931971c48fc6052d',
  '6a8f5588a42a82d59ad7163e',
].map((id) => id.replace(/[^a-f0-9]/gi, 'a').slice(0, 24));

const MOCK_ORDER_DATES = [
  '2026-06-15T14:22:00.000Z',
  '2026-06-15T11:05:00.000Z',
  '2026-06-15T09:18:00.000Z',
  '2026-06-13T16:40:00.000Z',
  '2026-06-13T10:12:00.000Z',
  '2026-06-11T08:55:00.000Z',
  '2026-06-11T07:30:00.000Z',
  '2026-06-04T19:10:00.000Z',
  '2026-06-04T12:45:00.000Z',
  '2026-06-02T15:20:00.000Z',
];

const PURCHASE_PRODUCTS = [
  MOCK_PRODUCTS[4],
  MOCK_PRODUCTS[9],
  MOCK_PRODUCTS[8],
  MOCK_PRODUCTS[3],
  MOCK_PRODUCTS[8],
  MOCK_PRODUCTS[11],
  MOCK_PRODUCTS[10],
  MOCK_PRODUCTS[0],
  MOCK_PRODUCTS[5],
  MOCK_PRODUCTS[6],
];

export function getMockUserOrders(userId: string): Order[] {
  if (userId !== 'mock-user-demo' && userId !== 'mock-user-admin') {
    return [];
  }

  return PURCHASE_PRODUCTS.map((product, index) => {
    const createdAt = MOCK_ORDER_DATES[index] ?? MOCK_ORDER_DATES[0];
    const orderId = `mock-order-${index + 1}`;

    return {
      id: orderId,
      order_number: MOCK_ORDER_IDS[index] ?? `order${index}${product.id}`.replace(/[^a-z0-9]/gi, '').slice(0, 24),
      user_id: userId,
      total_amount: product.price,
      discount_amount: 0,
      status: 'completed',
      payment_status: 'paid',
      coupon_id: null,
      notes: null,
      created_at: createdAt,
      updated_at: createdAt,
      order_items: [
        {
          id: `${orderId}-item-1`,
          order_id: orderId,
          product_id: product.id,
          quantity: 1,
          price: product.price,
          created_at: createdAt,
          product,
        },
      ],
    };
  });
}
