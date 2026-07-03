-- Run in Supabase → SQL Editor.
-- Sets admin@nexlogs.com password and admin role. No Vercel env vars needed.
-- Change target_password below, then Run.

DO $$
DECLARE
  target_email text := 'admin@nexlogs.com';
  target_password text := 'Adedolapo2020$';
  user_id uuid;
  inst_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE lower(email) = lower(target_email);
  SELECT instance_id INTO inst_id FROM auth.users LIMIT 1;

  IF inst_id IS NULL THEN
    inst_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  IF user_id IS NULL THEN
    user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      inst_id,
      user_id,
      'authenticated',
      'authenticated',
      target_email,
      extensions.crypt(target_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(target_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = user_id;
  END IF;

  UPDATE profiles
  SET role = 'admin', email = target_email
  WHERE id = user_id;

  IF NOT FOUND THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (user_id, target_email, 'Admin', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', email = EXCLUDED.email;
  END IF;
END $$;

SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE lower(u.email) = lower('admin@nexlogs.com');
