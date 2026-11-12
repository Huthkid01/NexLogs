-- Server-side safety net: auto-refund SMS numbers that expired without a code
-- even if the buyer closed the Buy Numbers page (no client sync).

CREATE OR REPLACE FUNCTION public.auto_refund_expired_sms_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT o.id
    FROM sms_number_orders o
    WHERE o.status IN ('active', 'completed', 'expired')
      AND o.expires_at IS NOT NULL
      AND o.expires_at <= NOW()
      AND NOT is_valid_sms_verification_code(o.verification_code)
      AND NULLIF(btrim(COALESCE(o.metadata->>'refund_wallet_transaction_id', '')), '') IS NULL
      AND COALESCE(o.charged_ngn, 0) > 0
    ORDER BY o.expires_at ASC
    LIMIT 100
  LOOP
    BEGIN
      PERFORM refund_sms_number_order_without_code(
        v_order.id,
        'expired'::sms_number_order_status,
        'SMS order expired without code'
      );
      v_count := v_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Keep scanning other orders; one bad row must not block refunds.
        RAISE WARNING 'auto_refund_expired_sms_orders failed for %: %', v_order.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_refund_expired_sms_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_refund_expired_sms_orders() TO postgres;
GRANT EXECUTE ON FUNCTION public.auto_refund_expired_sms_orders() TO service_role;

COMMENT ON FUNCTION public.auto_refund_expired_sms_orders() IS
  'Refunds expired SMS number orders that never received a verification code (wallet credit).';

-- Run every minute so buyers get money back without clicking Cancel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sms-expire-auto-refund') THEN
    PERFORM cron.unschedule('sms-expire-auto-refund');
  END IF;

  PERFORM cron.schedule(
    'sms-expire-auto-refund',
    '* * * * *',
    $job$SELECT public.auto_refund_expired_sms_orders()$job$
  );
END;
$$;
