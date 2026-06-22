-- Use Supabase Auth + Hostinger SMTP for signup/reset emails instead of the Node welcome trigger.
-- Run this after you configure custom SMTP in Supabase Dashboard → Authentication → SMTP Settings.

DROP TRIGGER IF EXISTS profiles_send_welcome_email ON profiles;
