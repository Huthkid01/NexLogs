CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_suspended IS DISTINCT FROM OLD.is_suspended) THEN
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Only admins can change role or suspension status' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_privilege_escalation_guard') THEN
    NULL;
  ELSE
    CREATE TRIGGER profiles_privilege_escalation_guard
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_profile_privilege_escalation();
  END IF;
END $$;
