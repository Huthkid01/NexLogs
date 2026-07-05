# 5sim setup (Buy Numbers — Service 2)

## Supabase secret

The `fivesim` edge function runs on Supabase. Set the **5SIM protocol** API key once:

```bash
supabase secrets set FIVESIM_API_KEY=your-5sim-api-key --project-ref YOUR_PROJECT_REF
```

Use the key from **Profile → Get API key → API key for 5SIM protocol** (not the deprecated API1 key).

Pricing still uses Admin → SMS Pricing settings per provider (`smspool` / `fivesim`).

## 5sim endpoints used

| Endpoint | Purpose |
|---|---|
| `GET /guest/countries` | Country list |
| `GET /guest/products/any/any` | Service catalog |
| `GET /guest/prices?country=&product=` | Buy flow pool pricing (primary) |
| `GET /guest/prices?product=` | Admin service price preview |
| `GET /guest/products/{country}/{operator}` | Pricing fallback |
| `GET /user/balance` | Admin balance (falls back to profile) |
| `POST /user/max-prices` | Cap provider cost before each purchase |
| `GET /user/buy/activation/...` | Purchase number |
| `GET /user/check/{id}` | Poll for SMS |
| `GET /user/finish/{id}` | Close order after code received |
| `GET /user/cancel/{id}` | Cancel before SMS |
| `GET /user/ban/{id}` | Report number already used |
| `GET /user/orders?category=activation` | Admin provider history |

## Deploy

```bash
supabase db push --yes
supabase secrets set FIVESIM_API_KEY=your-5sim-api-key --project-ref YOUR_PROJECT_REF
supabase functions deploy fivesim --yes --project-ref YOUR_PROJECT_REF
supabase functions deploy smspool --yes --project-ref YOUR_PROJECT_REF
```

## Verify after deploy

```bash
./supabase/setup/verify-fivesim.sh
```

Expected output:
- `countries=150+`, `services=1000+`
- USA WhatsApp pools with `cost` and `stock`

Then in the app:
1. **Admin → SMS Pricing → 5sim** — balance ~$10, WhatsApp prices load
2. **Buy Numbers → Service 2** — pick country + WhatsApp → price options appear
3. Confirm one test order with wallet funds

Deploy the frontend (Vercel) after backend is verified so users get the Service 2 UI and admin SMS Pricing dropdown.

API docs: https://5sim.net/docs

**Never commit real API keys to git.**
