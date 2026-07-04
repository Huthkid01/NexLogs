# Vercel environment variables

Use **`client/.env.vercel`** — copy/paste or import into Vercel.

## Steps

1. Open [Vercel](https://vercel.com) → **nex-logs-client** → **Settings** → **Environment Variables**
2. Confirm **Root Directory** is `client`
3. Click **Import .env** and upload `client/.env.vercel`  
   **Or** paste each `KEY=value` line manually
4. Check **Production**, **Preview**, and **Development**
5. **Redeploy** the project

## Files

| File | Purpose |
|------|---------|
| `client/.env.vercel` | Your real values — **gitignored**, safe to copy to Vercel |
| `client/.env.vercel.example` | Template with placeholders (committed to repo) |

## Variables to add (all in Vercel)

| Variable | Where to get it |
|----------|-----------------|
| `VITE_USE_MOCK_DATA` | `false` |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon public) |
| `VITE_APP_URL` | `https://www.nexlogs.store` |
| `VITE_APP_NAME` | `Nexlogs` |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud → OAuth Web client ID |

Admin login does **not** use Vercel env vars. Set the password in **Supabase → Authentication → Users** and ensure `profiles.role = 'admin'`.

Copy the full list from `client/.env.vercel.example`.

## Do NOT add to Vercel

These stay in Supabase secrets / local `.env` only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `KORA_SECRET_KEY`
- `SMTP_*`, `EMAIL_WEBHOOK_SECRET`
- `TELEGRAM_*`
- `GOOGLE_CLIENT_SECRET`
