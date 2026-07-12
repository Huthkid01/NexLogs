-- Fix ambiguous queue_user_email overload (4-arg vs 5-arg from migration 076).
-- Without this, wallet deposits fail with:
--   function queue_user_email(unknown, uuid, unknown, uuid) is not unique

DROP FUNCTION IF EXISTS public.queue_user_email(text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION trigger_queue_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM queue_user_email('welcome'::text, NEW.id, NULL::uuid, NULL::uuid, NULL::uuid);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_purchase_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM queue_user_email('purchase'::text, NULL::uuid, NEW.id, NULL::uuid, NULL::uuid);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_wallet_deposit_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind = 'deposit' AND NEW.status = 'completed' THEN
    PERFORM queue_user_email(
      'wallet_deposit'::text,
      NEW.user_id,
      NULL::uuid,
      NEW.id,
      NULL::uuid
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_order_details_ready_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(trim(NEW.delivered_details), '') = '' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(trim(OLD.delivered_details), '') <> '' THEN
    RETURN NEW;
  END IF;

  PERFORM queue_user_email(
    'order_details_ready'::text,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    NEW.id
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_queue_wallet_deposit_email IS
  'Queues wallet deposit email using the 5-arg queue_user_email signature with explicit casts.';
