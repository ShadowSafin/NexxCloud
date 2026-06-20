# Contributing to NexxCloud

Thank you for helping make NexxCloud more dependable. The highest-value contributions keep
file bytes, metadata, references, and user-visible storage totals consistent even when a
request fails halfway through.

## Start Here

Read these documents before changing core behavior:

| Document                             | Use it for                                                            |
| ------------------------------------ | --------------------------------------------------------------------- |
| [README.md](./README.md)             | Product scope, setup, configuration, and operational overview.        |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Storage invariants, data model, service boundaries, and worker flows. |
| [API.md](./API.md)                   | HTTP contracts, authentication, uploads, and media delivery.          |
| [LICENSE](./LICENSE)                 | MIT license terms for use and redistribution.                         |

## Development Setup

### Compose Workflow

```bash
git clone https://github.com/ShadowSafin/NewCloud.git NexxCloud
cd NexxCloud
bash setup.sh
```

On Windows use `setup.bat`. Both first-install launchers create a production `.env` with
independent cryptographic secrets, prepare storage, run Compose, and wait for readiness.
After first boot, use:

```bash
sh start.sh
docker compose ps
docker compose logs -f backend worker
```

Compose brings up the UI, API, worker, PostgreSQL, and Redis. The API applies committed
Prisma migrations through `prisma migrate deploy` during container startup.

### Manual Workflow

Configure PostgreSQL, Redis, `DATABASE_URL`, `REDIS_URL`, `STORAGE_ROOT`, and required
secrets before starting the backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Start the worker in a second terminal:

```bash
cd backend
npm run worker
```

Start the frontend in a third terminal:

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Native Desktop Server Workflow

Use this path when changing the Electron server host, setup UI, live logs, LAN URL display,
or desktop installer packaging:

```powershell
npm ci --prefix native
npm run --prefix native prepare:runtime
npm run --prefix native build:host
native\node_modules\.bin\electron-builder.cmd --projectDir native --win nsis --publish never
```

The staging step rebuilds the backend/frontend, creates the SQLite native Prisma payload,
and refreshes `native/runtime`. The packaged server sets `NEXXCLOUD_NATIVE_RUNTIME=true`,
so backend queue/cache changes must keep both the Redis/BullMQ path and the in-process
native path working.

## Codebase Guide

| Path                           | Changes that belong here                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| `backend/prisma/schema.prisma` | Relational models, foreign keys, unique constraints, and indexes.   |
| `backend/src/routes/`          | URL mounting and middleware ordering.                               |
| `backend/src/controllers/`     | HTTP translation, status codes, and response payloads.              |
| `backend/src/services/`        | Domain rules and transactional/file-system behavior.                |
| `backend/src/workers/`         | Asynchronous processing and scheduled repair jobs.                  |
| `backend/src/middleware/`      | Authentication, upload staging/validation, rate limits, and errors. |
| `frontend/src/lib/`            | Central API and chunk-upload clients.                               |
| `frontend/src/store/`          | Client-side auth, explorer, upload, clipboard, and toast state.     |
| `frontend/src/components/`     | User-interface components and application surfaces.                 |
| `native/src/`                  | Electron host lifecycle, native service spawning, logs, and LAN URLs. |
| `native/ui/`                   | Desktop server setup window and native-control styling.             |

## Engineering Rules

### Storage and Database Integrity

When modifying files, folders, versions, uploads, or cleanup:

1. Treat `StorageBlob` as the owner of shared physical bytes.
2. Never share a `storedName` as a deduplication mechanism.
3. Increment or release blob references within the transaction that changes related
   `File` or `FileVersion` metadata.
4. Delete physical bytes only after the database commit has proved no references remain.
5. Keep `storageUsed` and `trashSize` derived from current file state through the central
   accounting service.
6. Test same-name replacement, duplicate content, restore, final deletion, and rollback
   scenarios before merging storage changes.

### API and Security

- Authenticate protected API requests with `Authorization: Bearer <access-token>`.
- Use signed media URLs for browser preview/download elements rather than adding access
  JWTs to URLs.
- Keep uploads disk-streamed and respect configured whole-file and per-chunk bounds.
- Add binary-signature coverage when introducing support for a format that is claimed as
  validated.
- Treat reverse proxy, CORS, secret validation, queue administration, and range streaming
  behavior as production surfaces.

### Frontend

- Route backend calls through `frontend/src/lib/api.ts` or its public-share counterpart.
- Preserve the environment-aware API-origin behavior for both proxy and direct API modes.
- Keep server-side storage state authoritative; optimistic state must recover on failure.
- Follow the existing dark, glass-panel, cyan/violet-accent visual system.

## Database Changes

Use Prisma migrations for schema work:

```bash
cd backend
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

Commit both the schema change and generated migration directory. Do not introduce
destructive `db push --accept-data-loss` startup commands.

Before proposing a storage migration, describe:

- how existing physical content is discovered,
- how references are verified,
- what happens if processing is interrupted,
- how repair can be retried,
- how rollback avoids losing bytes.

## Testing and Validation

### Required Local Checks

Run the checks for the areas you touched:

```bash
cd backend
npm run test
npm run lint
npm run typecheck
npm run build

cd ../frontend
npm run lint
npm run typecheck
npm run build
```

### Test Expectations by Change

| Change type                           | Minimum coverage expected                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| File signature or type handling       | Vitest unit tests for valid and invalid binary cases.                                            |
| Blob references or storage accounting | Tests proving create/copy/trash/restore/delete and last-reference cleanup behavior.              |
| Chunk upload or merge behavior        | Tests for missing chunks, invalid hash/signature, retries, cancellation, and merge finalization. |
| Route/controller contract             | Authenticated integration tests for success and representative failure responses.                |
| Frontend API/state behavior           | Typecheck/build plus focused interaction testing for touched workflows.                          |

The repository currently contains an initial Vitest suite for signature validation.
Contributions that expand storage and HTTP integration coverage are especially welcome.

## Style and Tooling

- Use TypeScript for application code.
- Keep strict TypeScript checks passing.
- Use the existing ESLint configuration in both packages.
- Format touched files consistently with Prettier.
- Prefer services for business rules and controllers for HTTP translation.
- Prefer structured database/API operations over string manipulation.
- Keep comments short and focused on non-obvious invariants.

Typical commands:

```bash
cd backend
npm run lint
npx prettier --check "src/**/*.ts" "tests/**/*.ts"

cd ../frontend
npm run lint
npx prettier --check "src/**/*.{ts,tsx,css}"
```

## Pull Requests

A focused pull request is easier to verify and safer to deploy.

Include:

- a concise problem statement,
- the behavior changed,
- any database, filesystem, environment, or deployment impact,
- tests run and results,
- manual verification steps for user-visible behavior,
- migration and rollback notes when persistent data is involved.

Avoid:

- bundling unrelated refactors with integrity fixes,
- changing stored paths or schema assumptions without migration notes,
- describing prepared infrastructure as live behavior before it is wired and tested.

## Reporting Security or Data-Loss Risks

If a finding could expose private media, leak authentication material, corrupt storage
references, or delete user bytes unexpectedly, do not include real credentials or private
payloads in a public report. Provide minimal reproduction steps and emphasize the affected
data path so maintainers can prioritize containment and repair.
