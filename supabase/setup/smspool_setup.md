# SMS Pool setup (Buy Numbers)

## Local testing (recommended first)

You already pushed migration `058` and deployed `smspool`. For local UI testing:

### 1. Root `.env` (repo root — Vite reads this)

```env
VITE_USE_MOCK_DATA=false
VITE_SUPABASE_URL=https://opmjctjzwkvwsxenddfi.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=Nexlogs
```

Get keys from **Supabase → Project Settings → API**.

### 2. SMS Pool secret on Supabase (remote function)

The `smspool` edge function runs on Supabase (not Vercel). Set the key once:

```bash
supabase secrets set SMSPOOL_API_KEY=your-smspool-api-key --project-ref opmjctjzwkvwsxenddfi
```

Optional fallbacks (Admin → SMS Pricing overrides these):

```bash
supabase secrets set SMSPOOL_USD_NGN_RATE=1500 --project-ref opmjctjzwkvwsxenddfi
supabase secrets set SMSPOOL_MARKUP_PERCENT=50 --project-ref opmjctjzwkvwsxenddfi
```

Set the live USD→NGN rate and markup under **Admin → SMS Pricing**.

### 3. Start the frontend

```bash
cd client
npm run dev
```

Open **http://localhost:5173**, log in, go to **Buy Numbers** (`/buy-numbers`).

### 4. Test checklist

- [ ] Service + country dropdowns load (catalog from SMS Pool)
- [ ] Price shows in NGN
- [ ] Wallet has enough balance (use **Add funds** or admin credit)
- [ ] **Buy number** returns a phone number
- [ ] Verification code appears after SMS arrives (polls every 5s)
- [ ] **Cancel and refund** works while waiting

---

## Optional: run the edge function on your machine

Use this when editing `supabase/functions/smspool` without redeploying each time.

**Terminal 1** — serve function locally:

```bash
cp supabase/.env.local.example supabase/.env.local
# Edit supabase/.env.local with real keys (never commit)

supabase functions serve smspool --env-file supabase/.env.local
```

**Root `.env`** — point the client at local functions:

```env
VITE_SUPABASE_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1
```

Keep `VITE_SUPABASE_URL` pointing at your **remote** Supabase project (auth + database stay remote).

**Terminal 2** — frontend:

```bash
cd client && npm run dev
```

Remove `VITE_SUPABASE_FUNCTIONS_URL` when you want to use the deployed function again.

---

## Production deploy

1. Secrets on Supabase (see above)
2. `supabase db push` (migration 058)
3. `supabase functions deploy smspool --yes`
4. Deploy frontend to Vercel

API docs: https://www.smspool.net/article/how-to-use-the-smspool-api-0dd6eadf4c

**Never commit real API keys to git.**
