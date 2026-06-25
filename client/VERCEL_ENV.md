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

## Do NOT add to Vercel

These stay in Supabase secrets / local `.env` only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `KORA_SECRET_KEY`
- `SMTP_*`, `EMAIL_WEBHOOK_SECRET`
- `TELEGRAM_*`
- `GOOGLE_CLIENT_SECRET`
