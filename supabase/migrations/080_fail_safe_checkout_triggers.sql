-- Never roll back wallet purchases or admin credits when optional email hooks fail.
-- Also re-applies the queue_user_email overload fix from migration 078 when needed.

DROP FUNCTION IF EXISTS public.queue_user_email(text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION trigger_queue_purchase_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM queue_user_email('purchase'::text, NULL::uuid, NEW.id, NULL::uuid, NULL::uuid);
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

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
    BEGIN
      PERFORM queue_user_email(
        'wallet_deposit'::text,
        NEW.user_id,
        NULL::uuid,
        NEW.id,
        NULL::uuid
      );
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_queue_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM queue_user_email('welcome'::text, NEW.id, NULL::uuid, NULL::uuid, NULL::uuid);
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

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

  BEGIN
    PERFORM queue_user_email(
      'order_details_ready'::text,
      NULL::uuid,
      NULL::uuid,
      NULL::uuid,
      NEW.id
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_queue_purchase_email IS
  'Queues purchase email without blocking checkout when email delivery fails.';
