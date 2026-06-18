DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
    CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'resolved');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_source') THEN
    CREATE TYPE support_ticket_source AS ENUM ('website_error', 'login', 'checkout', 'dashboard', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status support_ticket_status NOT NULL DEFAULT 'open',
  source support_ticket_source NOT NULL DEFAULT 'website_error',
  page_url TEXT,
  error_message TEXT,
  browser_info TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'support_tickets_updated_at') THEN
    NULL;
  ELSE
    CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
