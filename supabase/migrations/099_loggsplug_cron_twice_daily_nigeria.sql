-- Run LOGGSPLUG stock sync twice daily at Nigeria morning/night (WAT = UTC+1).
-- 8:00 AM WAT = 07:00 UTC, 8:00 PM WAT = 19:00 UTC.

DO $cronsetup$
BEGIN
  BEGIN
    PERFORM cron.unschedule('loggsplug-stock-sync');
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  PERFORM cron.schedule(
    'loggsplug-stock-sync',
    '0 7,19 * * *',
    $job$SELECT public.queue_loggsplug_stock_sync()$job$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not reschedule loggsplug-stock-sync cron: %', SQLERRM;
END;
$cronsetup$;
