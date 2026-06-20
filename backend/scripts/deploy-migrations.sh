#!/usr/bin/env sh
set -eu

log() {
  printf '%s\n' "[NexxCloud migrations] $*"
}

output_file=$(mktemp)
trap 'rm -f "$output_file"' EXIT

if npx prisma migrate deploy >"$output_file" 2>&1; then
  cat "$output_file"
  exit 0
fi

if ! grep -q "P3005" "$output_file"; then
  cat "$output_file" >&2
  log "Migration deployment failed for a reason that cannot be safely bootstrapped."
  exit 1
fi

if ! node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verifyLegacyDatabase() {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'folders', 'files')"
  );
  const tables = new Set(rows.map((row) => row.table_name));
  const missing = ["users", "folders", "files"].filter((table) => !tables.has(table));

  if (missing.length > 0) {
    throw new Error(`Database is nonempty but does not match a legacy NexxCloud schema; missing: ${missing.join(", ")}`);
  }
}

verifyLegacyDatabase()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(`[NexxCloud migrations] ${error.message}`);
    await prisma.$disconnect();
    process.exit(1);
  });
NODE
then
  log "Refusing to apply a baseline to an unrecognized nonempty database."
  exit 1
fi

log "Detected a pre-migration schema-push database; applying the additive baseline."
npx prisma db execute \
  --schema ./prisma/schema.prisma \
  --file ./prisma/migrations/20260522000000_initial_schema/migration.sql
npx prisma migrate resolve --applied 20260522000000_initial_schema

log "Applying the content-addressed storage migration idempotently."
npx prisma db execute \
  --schema ./prisma/schema.prisma \
  --file ./prisma/migrations/20260523000000_storage_blobs/migration.sql
npx prisma migrate resolve --applied 20260523000000_storage_blobs

log "Baseline complete; verifying no migrations remain pending."
npx prisma migrate deploy
