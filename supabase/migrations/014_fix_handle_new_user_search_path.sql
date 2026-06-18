CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    code := public.generate_referral_code();
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, avatar_url, referral_code)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        code
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF attempts >= 8 THEN
          RAISE;
        END IF;
    END;
  END LOOP;

  INSERT INTO public.carts (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
