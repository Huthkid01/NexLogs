# Purchase & add-funds emails (Render + Hostinger)

Auth emails (signup, forgot password) → **Supabase Auth + Hostinger SMTP** in the dashboard.

Purchase & wallet emails → **small free API on Render** (this `server/` folder). You do not run it on your laptop.

---

## Step 1 — Hostinger mailbox

Create e.g. `hello@yourdomain.com` and note:

| Setting | Value |
|---------|--------|
| SMTP host | `smtp.hostinger.com` |
| Port | `465` (SSL) |
| Username | full email |
| Password | mailbox password |

---

## Step 2 — Deploy on Render (free)

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Blueprint** (or Web Service).
3. Connect the repo. Render reads `render.yaml` and deploys `server/`.
4. Set these **Environment** variables on Render:

| Variable | Example |
|----------|---------|
| `SMTP_USER` | `hello@yourdomain.com` |
| `SMTP_PASS` | your Hostinger password |
| `EMAIL_FROM_ADDRESS` | `hello@yourdomain.com` |
| `EMAIL_FROM_NAME` | `Nexlogs` |
| `SUPABASE_URL` | `https://opmjctjzwkvwsxenddfi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API |
| `APP_URL` | `https://nex-logs-client.vercel.app` |
| `CLIENT_ORIGINS` | `https://nex-logs-client.vercel.app` |
| `EMAIL_WEBHOOK_SECRET` | long random string (copy for Step 3) |

5. Deploy. Copy your live URL, e.g. `https://nexlogs-email.onrender.com`.

**Note:** Free Render sleeps after ~15 min idle; first email after sleep may take ~30s. Upgrade to paid for always-on.

---

## Step 3 — Supabase SQL

Run migrations **039** (if not applied), then edit and run:

`supabase/setup/render_transactional_emails.sql`

- `email_api_base` = your Render URL  
- `email_webhook_secret` = same as on Render  

---

## Step 4 — Test

1. Make a test purchase or add funds on the live site.
2. User should get email from your Hostinger address.
3. Or run in SQL Editor:
   ```sql
   SELECT queue_user_email('purchase', NULL, 'ORDER_UUID'::uuid);
   ```

---

## What sends what

| Email | Sender |
|-------|--------|
| Sign up / verify | Supabase Auth (Hostinger SMTP in dashboard) |
| Forgot password | Supabase Auth |
| Purchase confirmed | Render email API |
| Wallet funded | Render email API |

No Gmail. No Edge Functions. No server on your PC.
