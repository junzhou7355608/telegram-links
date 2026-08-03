#!/usr/bin/env zsh

set -euo pipefail

: "${DIRECT_DATABASE_URL:?DIRECT_DATABASE_URL is required}"

source_container=${SOURCE_POSTGRES_CONTAINER:-telegram-links-postgres-1}
source_database=${SOURCE_POSTGRES_DATABASE:-telegram_links}
source_user=${SOURCE_POSTGRES_USER:-telegram_links}
target_database_url=$(
  DIRECT_DATABASE_URL="$DIRECT_DATABASE_URL" node -e '
    const url = new URL(process.env.DIRECT_DATABASE_URL);
    url.searchParams.delete("schema");
    process.stdout.write(url.toString());
  '
)

# The target schema already has foreign keys because migrations run before this
# script. Keep parent tables before their dependants instead of relying on
# pg_dump's alphabetical table-data order.
tables=(
  Category
  Tag
  TelegramAccount
  SyncJob
  Link
  TelegramChat
  TelegramMessage
  SyncJobChat
  LinkTag
  LinkSource
)

source_psql() {
  docker exec "$source_container" \
    psql --username "$source_user" --dbname "$source_database" "$@"
}

target_psql() {
  docker exec --interactive \
    --env TARGET_DATABASE_URL="$target_database_url" \
    "$source_container" \
    sh -c 'exec psql "$TARGET_DATABASE_URL" "$@"' sh "$@"
}

table_count() {
  database=$1
  table=$2

  if [[ "$database" == source ]]; then
    source_psql --no-psqlrc --tuples-only --no-align \
      --command "SELECT count(*) FROM public.\"$table\";"
  else
    target_psql --no-psqlrc --tuples-only --no-align \
      --command "SELECT count(*) FROM public.\"$table\";"
  fi
}

if [[ $(docker inspect --format '{{.State.Running}}' "$source_container") != true ]]; then
  print -u2 -- "Source PostgreSQL container is not running: $source_container"
  exit 1
fi

typeset -A source_counts
for table in "${tables[@]}"; do
  source_counts[$table]=$(table_count source "$table")
  if [[ $(table_count target "$table") != 0 ]]; then
    print -u2 -- "Target business tables must be empty; $table already has data."
    exit 1
  fi
done

{
  print -r -- 'BEGIN;'
  for table in "${tables[@]}"; do
    docker exec "$source_container" pg_dump \
      --username "$source_user" \
      --dbname "$source_database" \
      --schema public \
      --table "public.\"$table\"" \
      --data-only \
      --format plain \
      --no-owner \
      --no-privileges
  done
  print -r -- 'COMMIT;'
} | target_psql --no-psqlrc --quiet --set ON_ERROR_STOP=1

printf '%-20s %12s %12s\n' table source target
for table in "${tables[@]}"; do
  target_count=$(table_count target "$table")
  printf '%-20s %12s %12s\n' \
    "$table" "${source_counts[$table]}" "$target_count"
  if [[ "$target_count" != "${source_counts[$table]}" ]]; then
    print -u2 -- "Row count mismatch for $table."
    exit 1
  fi
done

print -- 'Data import committed; all business-table row counts match.'
