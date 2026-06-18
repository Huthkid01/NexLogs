# Nexlogs - Social Media Marketplace

A production-ready digital marketplace platform built with React 19, Vite, TypeScript, Tailwind CSS v4, and Supabase.

## Features

- **Authentication** - Email signup/login, Google OAuth, password reset via Supabase Auth
- **Marketplace** - Browse, search, filter, and sort social media account listings
- **Shopping Cart** - Add to cart, apply coupons, checkout flow
- **Customer Dashboard** - Orders, wishlist, notifications, profile management
- **Admin Dashboard** - User management, products, orders, analytics
- **Blog & Content** - Blog posts, FAQs, testimonials
- **Security** - Row Level Security (RLS) policies on all tables

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, React Router v7 |
| Styling | Tailwind CSS v4, Shadcn-style UI components |
| State | Zustand, TanStack Query |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Deployment | Vercel (frontend), Supabase (backend) |

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
cd Nexlogs
npm install
```

### 2. Configure environment

```bash
cp client/.env.example client/.env
```

**Frontend-only demo (no Supabase):** keep `VITE_USE_MOCK_DATA=true` in `client/.env` and leave Supabase keys empty.

**Demo login:**
| Role | Email | Password |
|------|-------|----------|
| User | `demo@nexlogs.com` | `Demo1234!` |
| Admin | `admin@nexlogs.com` | `Admin1234!` |

When ready for the real backend, set `VITE_USE_MOCK_DATA=false` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up Supabase database

Run the SQL migrations in order via the Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/seed.sql` (optional seed data)

### 4. Configure Google OAuth

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Enable Google and add your OAuth credentials
3. Set redirect URL to `https://your-project.supabase.co/auth/v1/callback`

### 5. Create an admin user

After registering, promote your account in the SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Run development server

```bash
npm run dev
```

Visit `http://localhost:5173`

## Project Structure

```
Nexlogs/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI and shared components
│       ├── contexts/       # React contexts (Auth)
│       ├── features/       # Feature modules
│       ├── hooks/          # Custom hooks
│       ├── layouts/        # Page layouts
│       ├── lib/            # Supabase client, utilities
│       ├── pages/          # Route pages
│       ├── routes/         # Router config
│       ├── services/       # Supabase service layer
│       ├── store/          # Zustand stores
│       ├── types/          # TypeScript types
│       └── constants/      # App constants
├── supabase/
│   ├── migrations/         # SQL schema + RLS
│   └── seed.sql            # Seed data
└── .env.example
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions.

## License

Private - All rights reserved.
