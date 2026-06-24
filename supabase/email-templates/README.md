# Email templates

## What actually gets sent

| Email | Live code | Data source |
|-------|-----------|-------------|
| Purchase confirmed | `supabase/functions/send-transactional-email/templates.ts` | Real order + customer profile |
| Wallet funded | same file | Real deposit + wallet balance |
| Sign up / reset password | Supabase Dashboard → Email Templates | Supabase Auth |

The `.html` files in this folder are **reference layouts** with `{{placeholders}}`.  
They are **not** emailed to customers. Real emails use the customer's name, order total, balance, etc. from the database.

## Edit live templates

1. Edit `supabase/functions/send-transactional-email/templates.ts`
2. Redeploy:

```bash
supabase functions deploy send-transactional-email
```

## Placeholder reference

### Purchase (`purchase.html`)

| Placeholder | Example at send time |
|-------------|----------------------|
| `{{customer_name}}` | User's full name or email prefix |
| `{{order_number}}` | e.g. `NLX-8f3a2b` |
| `{{product_lines}}` | List of products purchased |
| `{{total_amount}}` | e.g. `$29.99` |
| `{{pending_rdp}}` | Shows RDP notice when applicable |
| `{{app_url}}` | `https://nexlogs.store` |

### Wallet (`wallet-deposit.html`)

| Placeholder | Example at send time |
|-------------|----------------------|
| `{{customer_name}}` | User's full name |
| `{{amount_added}}` | Deposit amount |
| `{{new_balance}}` | Wallet balance after deposit |
| `{{reference}}` | Payment reference |
| `{{app_url}}` | `https://nexlogs.store` |
