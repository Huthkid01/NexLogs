CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_suspended IS DISTINCT FROM OLD.is_suspended) THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Only admins can change role or suspension status' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
