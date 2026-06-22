-- Hostinger + Supabase Auth (signup/reset) + Render (purchase/wallet)
-- Full guide: DEPLOYMENT_EMAIL.md

-- AUTH (Supabase Dashboard only — not .env):
--   Authentication → SMTP Settings → smtp.hostinger.com
--   Email Templates → Confirm signup, Reset password
-- Run migration 036 (drops duplicate welcome trigger)

-- TRANSACTIONAL (Render):
--   Deploy server/ to Render → set Hostinger SMTP env vars
--   Run migration 039 + supabase/setup/render_transactional_emails.sql
