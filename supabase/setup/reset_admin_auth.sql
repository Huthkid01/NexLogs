-- Reset admin sign-in for admin@nexlogs.com (run in Supabase SQL Editor).
-- Replace the password below, then sign in at /admin/login with that email + password.

UPDATE auth.users
SET
  encrypted_password = extensions.crypt('YOUR_NEW_PASSWORD_HERE', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'admin@nexlogs.com';

UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@nexlogs.com';

SELECT u.email, u.email_confirmed_at, p.role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'admin@nexlogs.com';
