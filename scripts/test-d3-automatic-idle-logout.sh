#!/usr/bin/env bash
set -euo pipefail

# Runs the automatic-logout pgTAP suite in a disposable Docker database. It
# never connects to Supabase cloud or the project's development database.

d3_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
d3_docker=(docker)
d3_container="andima-d3-idle-logout-test"
d3_image="public.ecr.aws/supabase/postgres:17.6.1.095"

cleanup() {
  "${d3_docker[@]}" stop "$d3_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if "${d3_docker[@]}" ps --format '{{.Names}}' | grep -Fxq "$d3_container"; then
  echo "Using existing disposable automatic-logout test container."
else
  "${d3_docker[@]}" run --detach --rm \
    --name "$d3_container" \
    --env POSTGRES_PASSWORD=postgres \
    --env POSTGRES_DB=postgres \
    "$d3_image" >/dev/null
fi

for d3_attempt in $(seq 1 60); do
  if "${d3_docker[@]}" exec "$d3_container" \
    psql -U postgres -d postgres -Atqc 'select 1' >/dev/null 2>&1 \
    && ! "${d3_docker[@]}" exec "$d3_container" \
      pgrep -f '/docker-entrypoint-initdb.d/migrate.sh' >/dev/null 2>&1; then
    break
  fi

  if [ "$d3_attempt" -eq 60 ]; then
    "${d3_docker[@]}" logs "$d3_container" >&2
    echo "Timed out waiting for the disposable automatic-logout test database." >&2
    exit 1
  fi

  sleep 1
done

for d3_sql in \
  "$d3_root/scripts/d3-idle-logout-bootstrap.sql" \
  "$d3_root/supabase/migrations/20261124100000_d3_automatic_idle_logout.sql"; do
  "${d3_docker[@]}" exec -i -e PGPASSWORD=postgres "$d3_container" \
    psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < "$d3_sql"
done

d3_tap_output="$("${d3_docker[@]}" exec -i -e PGPASSWORD=postgres "$d3_container" \
  psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - \
  < "$d3_root/supabase/tests/d3_automatic_idle_logout.sql")"
printf '%s\n' "$d3_tap_output"

if grep -q '^not ok' <<< "$d3_tap_output"; then
  echo "Automatic-logout pgTAP suite failed." >&2
  exit 1
fi

echo "Automatic-logout pgTAP suite passed."
