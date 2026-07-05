-- Track which upstream SMS provider fulfilled each order (SMS Pool vs 5sim).

ALTER TABLE sms_number_orders
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'smspool';

CREATE INDEX IF NOT EXISTS sms_number_orders_user_provider_idx
  ON sms_number_orders (user_id, provider, created_at DESC);

COMMENT ON COLUMN sms_number_orders.provider IS 'Upstream SMS provider slug: smspool or fivesim';
