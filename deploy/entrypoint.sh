#!/bin/sh

set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${DIRECT_DATABASE_URL:?DIRECT_DATABASE_URL is required}"
: "${BASIC_AUTH_USERNAME:?BASIC_AUTH_USERNAME is required}"
: "${BASIC_AUTH_PASSWORD_HASH:?BASIC_AUTH_PASSWORD_HASH is required}"

cd /app

./node_modules/.bin/prisma migrate deploy --config prisma.config.ts

internal_port="${INTERNAL_PORT:-3001}"

PORT="$internal_port" node dist/src/main.js &
server_pid=$!

attempt=0
until wget --quiet --output-document=/dev/null \
  "http://127.0.0.1:${internal_port}/api/healthz"; do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid"
    exit $?
  fi

  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "Server did not become healthy within 60 seconds." >&2
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
    exit 1
  fi

  sleep 1
done

exec caddy run --config /app/deploy/Caddyfile --adapter caddyfile
