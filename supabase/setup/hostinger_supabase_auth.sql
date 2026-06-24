-- Hostinger + Supabase Auth (signup/reset) + Render (purchase/wallet)
-- Full guide: DEPLOYMENT_EMAIL.md

-- AUTH (Supabase Dashboard only — not .env):
--   Authentication → SMTP Settings → smtp.hostinger.com
--   Email Templates → Confirm signup, Reset password
-- Run migration 036 (drops duplicate welcome trigger)

-- TRANSACTIONAL (Edge Function — sales@nexlogs.store):
--   supabase secrets set + supabase functions deploy send-transactional-email
--   Run migration 039 + 040 + supabase/setup/hostinger_transactional_emails.sql
