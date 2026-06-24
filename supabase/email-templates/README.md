# Email templates

Live templates used when sending mail are in:

**`supabase/functions/send-transactional-email/templates.ts`**

Edit that file, then redeploy:

```bash
supabase functions deploy send-transactional-email
```

The `.html` files here are static previews of the layout (placeholders only).

| File | Used when |
|------|-----------|
| `purchase.html` | User completes a purchase |
| `wallet-deposit.html` | User adds funds to wallet |

Auth emails (sign up, password reset) are configured in **Supabase Dashboard → Email Templates**, not in this folder.
