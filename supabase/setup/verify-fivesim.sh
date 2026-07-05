#!/usr/bin/env bash
# Smoke-test Nexlogs ↔ 5sim via deployed Supabase edge functions.
# Usage: ./supabase/setup/verify-fivesim.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/client/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  exit 1
fi

SUPABASE_URL="$(grep '^VITE_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")"
ANON_KEY="$(grep '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")"

if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" ]]; then
  echo "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in client/.env.local"
  exit 1
fi

FN_URL="${SUPABASE_URL}/functions/v1/fivesim"
AUTH_HEADER="Authorization: Bearer ${ANON_KEY}"

echo "==> 5sim catalog"
CATALOG="$(curl -sS -X POST "$FN_URL" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -H "$AUTH_HEADER" \
  -d '{"action":"catalog"}')"

python3 - <<'PY' "$CATALOG"
import json, sys
d = json.loads(sys.argv[1])
assert d.get("ok"), d.get("error", d)
countries = d.get("countries") or []
services = d.get("services") or []
print(f"  ok: countries={len(countries)}, services={len(services)}")
assert len(countries) > 0, "No countries returned"
assert len(services) > 0, "No services returned"
whatsapp = [s for s in services if str(s.get("id", "")).lower() == "whatsapp"]
assert whatsapp, "WhatsApp service missing from catalog"
PY

echo "==> USA WhatsApp pools (guest/prices path)"
POOLS="$(curl -sS -X POST "$FN_URL" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -H "$AUTH_HEADER" \
  -d '{"action":"country_service_pools","country":"usa","service":"whatsapp"}')"

python3 - <<'PY' "$POOLS"
import json, sys
d = json.loads(sys.argv[1])
assert d.get("ok"), d.get("error", d)
rows = d.get("rows") or []
print(f"  ok: pools={len(rows)}")
assert rows, "No USA WhatsApp pools — check 5sim stock or FIVESIM_API_KEY"
best = rows[0]
print(f"  best: {best.get('pool_name')} cost=${best.get('cost_usd')} stock={best.get('stock')}")
PY

echo ""
echo "5sim edge function is reachable and returning live pricing."
echo "Admin balance/history require an admin login in the dashboard."
