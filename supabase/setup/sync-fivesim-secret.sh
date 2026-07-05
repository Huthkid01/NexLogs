#!/usr/bin/env bash
# Sync FIVESIM_API_KEY from supabase/.env.local to Supabase Edge Function secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/supabase/.env.local"
PROJECT_REF="${SUPABASE_PROJECT_REF:-opmjctjzwkvwsxenddfi}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

KEY="$(grep '^FIVESIM_API_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [[ -z "$KEY" ]]; then
  echo "FIVESIM_API_KEY is empty in $ENV_FILE"
  exit 1
fi

echo "Setting FIVESIM_API_KEY on project $PROJECT_REF..."
supabase secrets set "FIVESIM_API_KEY=$KEY" --project-ref "$PROJECT_REF"

echo "Redeploying fivesim function..."
supabase functions deploy fivesim --project-ref "$PROJECT_REF" --yes

echo "Done. Run ./supabase/setup/verify-fivesim.sh then refresh Admin → SMS Pricing → 5sim."
