-- Supabase blocks DELETE without a WHERE clause; use an explicit filter.

CREATE OR REPLACE FUNCTION clear_order_history()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_orders integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)::integer INTO v_deleted_orders FROM orders;

  IF to_regclass('public.telegram_alert_log') IS NOT NULL THEN
    DELETE FROM telegram_alert_log WHERE order_id IS NOT NULL;
  END IF;

  DELETE FROM orders WHERE id IS NOT NULL;

  RETURN json_build_object('cleared', true, 'deleted_orders', v_deleted_orders);
END;
$$;

GRANT EXECUTE ON FUNCTION clear_order_history() TO authenticated;
