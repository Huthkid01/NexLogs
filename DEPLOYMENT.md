# Nexlogs Deployment Guide

## Overview

| Component | Platform |
|-----------|----------|
| Frontend | Vercel |
| Database, Auth, Storage | Supabase |

---

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon public key** from Settings → API

### Run Migrations

In the Supabase SQL Editor, run these files in order:

1. `supabase/migrations/001_initial_schema.sql` — Creates all tables, triggers, and indexes
2. `supabase/migrations/002_rls_policies.sql` — Enables Row Level Security and storage buckets
3. `supabase/seed.sql` — Optional demo data

### Configure Authentication

**Email Auth:**
- Dashboard → Authentication → Providers → Email → Enable

**Google OAuth:**
1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com)
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Dashboard → Authentication → Providers → Google → Enable and paste credentials
4. Add site URL: `https://your-domain.vercel.app`
5. Add redirect URL: `https://your-domain.vercel.app/auth/callback`

### Storage Buckets

Buckets are created by the RLS migration. Verify in Dashboard → Storage:
- `product-images` (public)
- `avatars` (public)
- `blog-images` (public)

### Create Admin User

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@yourdomain.com';
```

---

## 2. Vercel Deployment

### Connect Repository

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Set **Root Directory** to `client`
4. Framework Preset: **Vite**

### Environment Variables

Add in Vercel project settings:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your anon key |
| `VITE_APP_URL` | `https://your-domain.vercel.app` |
| `VITE_APP_NAME` | `Nexlogs` |

### Build Settings

- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Deploy

Vercel auto-deploys on push to main. Your app will be live at `https://your-project.vercel.app`.

---

## 3. Post-Deployment Checklist

- [ ] Supabase site URL updated to production domain
- [ ] Google OAuth redirect URLs include production domain
- [ ] Admin user created and tested
- [ ] RLS policies verified (test as regular user and admin)
- [ ] Storage upload tested (product images, avatars)
- [ ] Email templates customized in Supabase Auth settings
- [ ] Custom domain configured on Vercel (optional)

---

## 4. Custom Domain (Optional)

### Vercel
1. Project Settings → Domains → Add domain
2. Update DNS records as instructed

### Supabase Auth
Update site URL and redirect URLs to use your custom domain.

---

## 5. Environment Variables Reference

```env
# Frontend (Vercel)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_URL=https://nexlogs.com
VITE_APP_NAME=Nexlogs

# Server-side only (Edge Functions / CI — never expose in frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Telegram order alerts (Supabase Edge Functions only — do NOT add to Vercel)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-chat-id
TELEGRAM_WEBHOOK_SECRET=long-random-secret
APP_URL=https://your-vercel-domain.vercel.app
```

---

## 7. Telegram purchase alerts

Alerts fire automatically when any order is created (RDP + marketplace products).

### Supabase setup (required)

1. Run migration `027_telegram_order_alerts.sql` in the SQL editor.
2. Deploy the edge function:
   ```bash
   supabase functions deploy telegram-order-alert --no-verify-jwt
   ```
3. In **Supabase Dashboard → Edge Functions → Secrets**, add:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ADMIN_CHAT_ID`
   - `TELEGRAM_WEBHOOK_SECRET` (pick a long random string)
   - `APP_URL` (your live site, e.g. `https://nex-logs-client.vercel.app`)

   **Do not** add secrets starting with `SUPABASE_` — Supabase blocks that prefix. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into every edge function.

   **Important:** Local `.env` values are NOT used by Edge Functions. Only add the four secrets above in the Supabase dashboard.
4. Run `supabase/setup/telegram_alerts.sql` in the SQL editor (replace `YOUR_PROJECT_REF` and use the **same** `TELEGRAM_WEBHOOK_SECRET` as step 3).

### Vercel

**Do not** add `TELEGRAM_BOT_TOKEN` or `TELEGRAM_ADMIN_CHAT_ID` to Vercel. Those are server secrets and belong in Supabase Edge Function secrets only.

---

## 6. Troubleshooting

**Auth redirect not working:**
- Verify redirect URLs in Supabase match exactly (including trailing slashes)
- Check Google OAuth authorized redirect URIs

**RLS blocking queries:**
- Ensure user is authenticated for protected operations
- Check `is_admin()` function works for admin routes
- Use Supabase logs to debug policy failures

**CORS errors:**
- Add your Vercel domain to Supabase allowed origins

**Build failures:**
- Ensure all env vars are set in Vercel
- Check Node.js version (18+ recommended)
