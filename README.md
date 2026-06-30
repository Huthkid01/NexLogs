# Nexlogs

Production-ready digital marketplace for social media accounts and related products.

**Live site:** [https://www.nexlogs.store](https://www.nexlogs.store)

Built with React 19, Vite, TypeScript, Tailwind CSS v4, and Supabase (PostgreSQL, Auth, Edge Functions, RLS).

---

## Features

### Customers

- **Authentication** — Email/password and Google Sign-In (`signInWithIdToken`)
- **Marketplace** — Browse, search, filter, and sort product listings
- **Wallet checkout** — Add funds (Kora / Flutterwave), pay with wallet balance, instant delivery for digital inventory
- **Featured products** — Highlighted listings with direct product deep-links
- **My Purchases** — Order history and delivered account details
- **RDP plans** — Purchase remote desktop plans from a live admin-synced catalog
- **Profile & notifications** — Account settings, wallet balance, in-app alerts

### Admin

- **Dashboard** — Users, products, categories, orders, coupons, tickets
- **Wallet & transactions** — Deposits, purchases, manual credits, NGN-native balances
- **RDP catalog** — Plan pricing synced with marketplace products
- **Site content** — Hero slides, FAQ, support channels, terms, refund policy
- **Email** — Transactional emails, HTML campaigns, broadcast sends
- **Analytics & activity** — Site visits, order alerts (Telegram), audit logs

### Platform

- **Row Level Security (RLS)** on Supabase tables
- **Realtime** catalog, wallet, and admin updates
- **Privacy & legal pages** — `/privacy`, `/refund`, `/terms`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, TypeScript, React Router v7 |
| Styling | Tailwind CSS v4, Radix UI primitives |
| Data | TanStack Query, Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Payments | Kora, Flutterwave (wallet top-ups) |
| Email | Supabase Edge Functions + optional Node email API (`server/`) |
| Deployment | Vercel (frontend), Supabase (database & functions) |

---

## Project Structure

```
Nexlogs/
├── client/                    # React frontend (Vercel root)
│   └── src/
│       ├── components/        # UI, home, admin, auth
│       ├── contexts/          # Auth, theme, display currency, site content
│       ├── hooks/
│       ├── layouts/
│       ├── lib/               # Utilities, email templates, RDP catalog
│       ├── pages/             # Public, auth, admin routes
│       ├── routes/
│       ├── services/          # Supabase service layer
│       └── types/
├── supabase/
│   ├── migrations/            # SQL schema, RPCs, RLS (001–055+)
│   ├── functions/             # Edge Functions (email, payments, Telegram)
│   └── seed.sql               # Optional seed data
├── server/                    # Optional Node email API (Hostinger/Nodemailer)
├── scripts/
├── .env.example               # Root / shared env reference
├── DEPLOYMENT.md              # Vercel + Supabase deployment
├── DEPLOYMENT_EMAIL.md        # Transactional & campaign email setup
└── client/GOOGLE_SIGNIN.md    # Google OAuth origins & verification notes
```

---

## Quick Start

### Prerequisites

- **Node.js 22.x** (see `package.json` engines)
- A [Supabase](https://supabase.com) project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for `db push`)

### 1. Install dependencies

```bash
git clone <repo-url>
cd Nexlogs
npm install
```

### 2. Configure environment

```bash
cp client/.env.example client/.env
```

Minimum variables for local development:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=Nexlogs
VITE_USE_MOCK_DATA=false

# Optional — Google Sign-In (public client ID only)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Secrets (Google client secret, Kora keys, email passwords) belong in **Supabase Dashboard** or `server/.env` — not in the Vercel frontend. See `.env.example` and `client/.env.example` for the full list.

### 3. Run database migrations

**Option A — Supabase CLI (recommended):**

```bash
supabase link --project-ref your-project-ref
supabase db push
```

**Option B — SQL Editor:**  
Run every file in `supabase/migrations/` in numeric order, then optionally `supabase/seed.sql`.

Recent important migrations:

- `053_wallet_ngn_native.sql` — NGN-native wallet & pricing
- `054_reconcile_wallet_balances_ngn.sql` — Balance reconciliation RPC
- `055_restore_purchase_product_details.sql` — Per-buyer product detail delivery

### 4. Configure Google Sign-In

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Add authorized JavaScript origins (`http://localhost:5173`, your production domain)
3. Enable **Google** in Supabase → Authentication → Providers (same Client ID + Secret)
4. Set `VITE_GOOGLE_CLIENT_ID` in `client/.env` / Vercel
5. Ensure **Privacy Policy** at `/privacy` documents Google data use (required for OAuth verification)

Full checklist: [`client/GOOGLE_SIGNIN.md`](./client/GOOGLE_SIGNIN.md)

### 5. Create an admin user

Register on the site, then in the Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (`client/`) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint (`client/`) |

From repo root with Supabase CLI:

```bash
supabase db push              # Apply pending migrations
supabase functions deploy     # Deploy Edge Functions
```

---

## Deployment

| Component | Platform |
|-----------|----------|
| Frontend | Vercel — set **Root Directory** to `client` |
| Database, Auth, Functions | Supabase |

Guides:

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Vercel + Supabase setup
- [`DEPLOYMENT_EMAIL.md`](./DEPLOYMENT_EMAIL.md) — Transactional & marketing email
- [`client/VERCEL_ENV.md`](./client/VERCEL_ENV.md) — Vercel environment variables

---

## Key Routes

| Path | Description |
|------|-------------|
| `/` | Home & marketplace catalog |
| `/marketplace?product=<slug>` | Deep-link to a product purchase modal |
| `/add-funds` | Wallet top-up |
| `/purchases` | Order history |
| `/purchase-rdp` | RDP plan checkout |
| `/privacy` | Privacy Policy (incl. Google Sign-In disclosure) |
| `/refund` | Refund Policy |
| `/admin` | Admin dashboard (role: `admin`) |

---

## License

Private — All rights reserved.
