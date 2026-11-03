-- Auto-sync LOGGSPLUG stock/prices every 15 minutes via pg_cron + pg_net.
-- Uses stock mode only (reseller /products list) to avoid Cloudflare IP blocks.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO public.app_config (key, value)
VALUES
  (
    'loggsplug_cron_secret',
    COALESCE(
      NULLIF(get_app_config('loggsplug_cron_secret'), ''),
      encode(extensions.gen_random_bytes(24), 'hex')
    )
  ),
  (
    'supabase_functions_base',
    COALESCE(
      NULLIF(get_app_config('supabase_functions_base'), ''),
      'https://opmjctjzwkvwsxenddfi.supabase.co/functions/v1'
    )
  )
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  updated_at = NOW()
WHERE public.app_config.value IS NULL OR btrim(public.app_config.value) = '';

CREATE OR REPLACE FUNCTION public.queue_loggsplug_stock_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
  v_anon_key TEXT;
  v_headers JSONB;
BEGIN
  v_base_url := get_app_config('supabase_functions_base');
  v_secret := get_app_config('loggsplug_cron_secret');
  v_anon_key := get_app_config('supabase_anon_key');

  IF v_base_url IS NULL OR btrim(v_base_url) = '' OR v_secret IS NULL OR btrim(v_secret) = '' THEN
    RETURN;
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-loggsplug-cron-secret', v_secret
  );

  IF v_anon_key IS NOT NULL AND btrim(v_anon_key) <> '' THEN
    v_headers := v_headers || jsonb_build_object(
      'Authorization', 'Bearer ' || v_anon_key,
      'apikey', v_anon_key
    );
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_base_url, '/') || '/loggsplug',
    headers := v_headers,
    body := jsonb_build_object(
      'action', 'sync_products',
      'sync_mode', 'stock',
      'sync_offset', 0,
      'sync_limit', 500
    ),
    timeout_milliseconds := 120000
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail surrounding transactions if cron invoke errors.
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_loggsplug_stock_sync() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_loggsplug_stock_sync() TO postgres;
GRANT EXECUTE ON FUNCTION public.queue_loggsplug_stock_sync() TO service_role;

DO $cronsetup$
BEGIN
  -- Unschedule old job name if present, then schedule every 15 minutes.
  BEGIN
    PERFORM cron.unschedule('loggsplug-stock-sync');
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  PERFORM cron.schedule(
    'loggsplug-stock-sync',
    '*/15 * * * *',
    $job$SELECT public.queue_loggsplug_stock_sync()$job$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule loggsplug-stock-sync cron: %', SQLERRM;
END;
$cronsetup$;

COMMENT ON FUNCTION public.queue_loggsplug_stock_sync() IS
  'Invokes loggsplug edge function stock sync. Requires app_config loggsplug_cron_secret (+ optional supabase_anon_key) and matching LOGGSPLUG_CRON_SECRET edge secret.';
