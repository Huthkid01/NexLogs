# Purchase & add-funds emails (Supabase Edge Function)

| Email | Sender | Where |
|-------|--------|--------|
| Sign up / verify | `support@nexlogs.store` | Supabase Dashboard → SMTP |
| Password reset | `support@nexlogs.store` | Supabase Dashboard |
| Purchase + wallet | `support@nexlogs.store` | Edge Function `send-transactional-email` |

**Templates:** `supabase/functions/send-transactional-email/templates.ts`

**Flow:** deposit or order → database trigger → Edge Function → Hostinger SMTP → inbox

---

## Setup (no Render)

### 1. Edge Function secrets

```bash
supabase secrets set \
  SMTP_USER=support@nexlogs.store \
  SMTP_PASS=your-hostinger-app-password \
  EMAIL_FROM_ADDRESS=support@nexlogs.store \
  EMAIL_FROM_NAME=Nexlogs \
  EMAIL_WEBHOOK_SECRET=your-long-random-secret \
  APP_URL=https://nexlogs.store

supabase functions deploy send-transactional-email
```

### 2. Supabase SQL (required)

Run **`supabase/setup/hostinger_transactional_emails_ready.sql`** in SQL Editor.

Do **not** set `email_api_base` unless you host `server/` somewhere else.

### 3. Test

```sql
SELECT queue_user_email('wallet_deposit', NULL, NULL, 'TRANSACTION_UUID'::uuid);
```

---

## Troubleshooting

| Log | Fix |
|-----|-----|
| **503** | Redeploy Edge Function; run full `hostinger_transactional_emails_ready.sql` |
| **500** + `535` / auth failed | Same app password as Supabase SMTP; username must be `support@nexlogs.store` |
| **500** + timeout | Try port 587 in Supabase-style test; check Edge Function logs Response body |
| **401** | `email_webhook_secret` must match `EMAIL_WEBHOOK_SECRET` |
| No email, no log | Triggers missing — re-run `hostinger_transactional_emails_ready.sql` |

Logs: Dashboard → Edge Functions → `send-transactional-email`

---

## Optional: `server/` on a VPS

If Edge SMTP keeps failing, you can host `server/` elsewhere and set `email_api_base` in `app_config`. Render is **not** required — any HTTPS URL for `server/` works.
