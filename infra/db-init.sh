#!/usr/bin/env sh
# reality-shop · interactive bootstrap for an EXISTING PostgreSQL instance.
#
# Prompts for an admin connection URL (never stored anywhere), then runs
# infra/postgres-init.sql against it. Idempotent — safe to re-run.
#
# Non-interactive use (CI / automation): set ADMIN_DATABASE_URL instead,
# the prompt is skipped.
set -eu

if [ -n "${ADMIN_DATABASE_URL:-}" ]; then
  admin_url="$ADMIN_DATABASE_URL"
else
  printf 'Admin connection URL (e.g. postgresql://postgres:PASSWORD@localhost:5432/postgres): '
  read -r admin_url
fi

if [ -z "$admin_url" ]; then
  echo 'error: no connection URL given' >&2
  exit 1
fi

psql "$admin_url" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/postgres-init.sql"

echo 'Done.'
