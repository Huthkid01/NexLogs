-- Fire Telegram purchase alerts after order_items exist.
-- Fixes LOGGSPLUG race where orders INSERT alerted before items were saved ("No items found").

CREATE OR REPLACE FUNCTION trigger_queue_telegram_order_alert_from_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- One alert per order (first item insert wins).
  IF EXISTS (
    SELECT 1
    FROM telegram_alert_log
    WHERE order_id = NEW.order_id
    LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM queue_telegram_order_alert(NEW.order_id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block checkout if Telegram fails
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_send_telegram_alert ON orders;

DROP TRIGGER IF EXISTS order_items_send_telegram_alert ON order_items;
CREATE TRIGGER order_items_send_telegram_alert
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_telegram_order_alert_from_item();

COMMENT ON FUNCTION trigger_queue_telegram_order_alert_from_item() IS
  'Queues admin Telegram purchase alert after the first order_item is inserted so product lines are available.';
