# Purchase & add-funds emails (Supabase Edge Function + Nodemailer)

No Render. No separate server. Templates live in the repo.

| Email | Sender | Where |
|-------|--------|--------|
| Sign up / verify | `no-reply@nexlogs.store` | Supabase Dashboard → SMTP + templates |
| Password reset | `no-reply@nexlogs.store` | Supabase Dashboard |
| Purchase confirmed | `sales@nexlogs.store` | Edge Function `send-transactional-email` |
| Wallet funded | `sales@nexlogs.store` | Edge Function `send-transactional-email` |

**HTML templates (edit these):**

- `supabase/functions/send-transactional-email/templates.ts` — purchase + wallet emails
- Preview copies: `supabase/email-templates/purchase.html`, `wallet-deposit.html`

**Flow:** order or deposit inserted → database trigger → Edge Function → Nodemailer → Hostinger SMTP → user inbox

---

## Step 1 — Deploy the Edge Function

From the project root (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in):

```bash
supabase link --project-ref opmjctjzwkvwsxenddfi

supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  SMTP_HOST=smtp.hostinger.com \
  SMTP_PORT=465 \
  SMTP_SECURE=true \
  SMTP_USER=sales@nexlogs.store \
  SMTP_PASS=your-hostinger-app-password \
  EMAIL_FROM_ADDRESS=sales@nexlogs.store \
  EMAIL_FROM_NAME=Nexlogs \
  EMAIL_WEBHOOK_SECRET=your-long-random-secret \
  APP_URL=https://nexlogs.store

supabase functions deploy send-transactional-email
```

Use the **same** `EMAIL_WEBHOOK_SECRET` in Step 2 SQL.

---

## Step 2 — Supabase SQL

Run in SQL Editor (edit the secret first):

`supabase/setup/hostinger_transactional_emails.sql`

This sets:

- `email_webhook_secret` — matches Edge Function secret
- `supabase_functions_base` — `https://opmjctjzwkvwsxenddfi.supabase.co/functions/v1`

Also run migration **039** and **040** if not applied yet.

---

## Step 3 — Test

```sql
SELECT queue_user_email('purchase', NULL, 'ORDER_UUID'::uuid);
```

Or complete a test purchase / add funds on the live site.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No email after purchase | Check `app_config` has `supabase_functions_base` + `email_webhook_secret` |
| 401 in function logs | Secret mismatch between SQL and `supabase secrets set` |
| 500 in function logs | Open invocation **Response body** for `"error"` field |
| `SUPABASE_SERVICE_ROLE_KEY is missing` | Add service role key to Edge Function secrets |
| SMTP auth failed | App password must be for `sales@nexlogs.store` |
| Connection timed out | Hostinger may block cloud SMTP — use `server/` on Railway (see below) |
| Function not found | Run `supabase functions deploy send-transactional-email` |

Logs: Supabase Dashboard → Edge Functions → `send-transactional-email` → Logs

---

## Optional: local Node server (`server/`)

The `server/` folder still works for local testing. Set `email_api_base` in `app_config` instead of `supabase_functions_base`. Production should use the Edge Function.
