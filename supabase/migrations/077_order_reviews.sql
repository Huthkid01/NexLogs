-- Link reviews to specific purchases (one review per order).

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_order_unique
  ON reviews (user_id, order_id)
  WHERE order_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;

CREATE POLICY "Users can create reviews for own orders"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_active_user()
    AND order_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled', 'refunded')
    )
  );

COMMENT ON COLUMN reviews.order_id IS 'Purchase order this review belongs to. One review per order per user.';
