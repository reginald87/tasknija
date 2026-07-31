# Tasknija

A two-sided marketplace platform connecting customers with local service vendors, property owners, and vehicle sellers. Customers can discover businesses, request quotes, fund escrow, and release payments on milestone completion. Vendors list services, properties, and vehicles directly to customers — no middlemen, no agents. Admin users oversee the platform via audit-logged actions.

---

## Setup

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Install dependencies

```bash
# from repo root
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# then edit .env with your values
```

> See **Secret rotation** below before filling in any value that may have ever been public.

### 3. Set up the database

This project uses **Prisma + SQLite**. The schema is defined in `server/prisma/schema.prisma`.

```bash
# Push schema to the local SQLite database and generate the Prisma Client
npx prisma db push --schema=server/prisma/schema.prisma
npx prisma generate --schema=server/prisma/schema.prisma
```

### 4. Seed the database (optional)

```bash
cd server
node prisma/seed.js
```

This creates seed categories, test profiles, and sample businesses.

### 5. Run the dev servers

```bash
# server (http://localhost:5000)
cd server && npm run dev

# client (http://localhost:5173)
cd client && npm run dev
```

---

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | SQLite file path (e.g. `file:./dev.db`) | yes |
| `NODE_ENV` | `development` \| `production` \| `test` | yes |
| `PORT` | Server port | no (default 5000) |
| `JWT_SECRET` | Secret for signing/verifying JWT tokens | yes |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) | no (default `7d`) |
| `PLATFORM_FEE_PERCENT` | Platform fee charged on milestone release | no (default `2`) |
| `PAYSTACK_SECRET_KEY` | Paystack secret (server-only) | yes |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | yes |
| `ALLOWED_ORIGIN` | CORS allowed origin (must not be `*` when credentials are enabled) | yes |
| `CORS_CREDENTIALS` | `true` to send `Access-Control-Allow-Credentials` | no (default `true`) |
| `LOG_LEVEL` | pino log level (`trace` … `fatal`, `silent`) | no (default `info`) |

---

## Secret rotation

If any secret has ever been exposed (committed, leaked in logs, shared in chat, etc.), treat it as compromised and rotate it **immediately** at the source.

### What to rotate

- `JWT_SECRET` (will invalidate all sessions)
- `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`

### How to rotate

1. **JWT**: Generate a new secret, update `.env`, restart the server. All existing sessions will need to re-authenticate.
2. **Paystack**: Regenerate API keys in the Paystack dashboard, update `.env`, and verify with a test transaction before going live.

### After rotating

- Verify logins still work.
- Verify webhook signatures still verify (place a test order).
- Audit git history: if secrets were ever committed, scrub them with `git filter-repo` and force-rotate even if you think they're safe.

---

## Database backups

### Recovery targets

| Metric | Target | Notes |
|---|---|---|
| **RPO** (Recovery Point Objective) | ≤ 1 hour | Maximum data loss acceptable in a disaster |
| **RTO** (Recovery Time Objective) | ≤ 4 hours | Maximum downtime acceptable |
| **Backup retention** | 30 days | Daily backups kept; weekly kept for 1 year |
| **Backup frequency** | Daily at 03:00 UTC | Off-peak; runs while platform is quietest |

RPO/RTO values are placeholders — operators should adjust to their SLA.

### Strategy: File-based SQLite backups (recommended)

SQLite databases are single files. The simplest and most reliable backup strategy is to copy the `.db` file while the server is running (SQLite handles concurrent reads safely).

**Daily backup script** (`server/scripts/backup-db.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

# Required env vars:
#   DATABASE_PATH  — path to the SQLite .db file (e.g. ./server/dev.db)
#   BACKUP_DIR     — directory where backups are stored
#   BACKUP_S3_BUCKET — (optional) S3 bucket for off-site upload

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILENAME="tasknija-${TIMESTAMP}.db"
LOCAL_PATH="${BACKUP_DIR:-./backups}/${FILENAME}"

# Copy the live database file (SQLite allows concurrent reads).
cp "${DATABASE_PATH}" "${LOCAL_PATH}"

echo "[backup] ${FILENAME} created at ${LOCAL_PATH}"
```

Schedule via cron or your orchestrator of choice:

```cron
# Daily at 03:00 UTC
0 3 * * * root /usr/local/bin/tasknija-backup.sh >> /var/log/tasknija-backup.log 2>&1
```

### Restore procedure

```bash
# Stop the server to prevent writes during restore.
# Copy the backup over the live database file.
cp /backups/tasknija-20260703T030000Z.db ./server/dev.db

# Restart the server.
cd server && npm run dev

# Verify row counts.
npx prisma db execute --schema=server/prisma/schema.prisma --execute "SELECT count(*) FROM profiles;"
```

### Backup validation

**Monthly restore drill** — restore the most recent daily backup into a side database and verify row counts. Document the drill result in a runbook.

### Disaster recovery checklist

When the database is lost/corrupted and needs to be restored:

- [ ] Identify the target restore point (most recent good backup).
- [ ] Copy the backup `.db` file over the live database path.
- [ ] Restart the server.
- [ ] Verify row counts against expected values.
- [ ] If verified, resume operations.
- [ ] Rotate any secrets that may have been compromised (see README → Secret rotation).
- [ ] Notify users if data loss occurred.
- [ ] Open a post-mortem doc in `runbooks/incidents/`.

---

## Scripts

### Server (`server/`)

| Script | Purpose |
|---|---|
| `npm run dev` | Start server with `node --watch` |
| `npm start` | Start server (production) |
| `npm test` | Run vitest once |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run test:coverage` | Run vitest with v8 coverage |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |

### Client (`client/`)

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm test` | Component tests (vitest) |

---

## Architecture

- **Server**: Node.js + Express, ESM. ESM-native config (`import.meta.url`).
- **Database**: Prisma ORM over SQLite (`server/prisma/dev.db`). Reference data (Country/State/LGA/City) is seeded from `server/prisma/locationData.js`; run `npm run seed -w server` to (re)apply.
- **Auth**: Custom JWT (access 7d + refresh 30d) with email OTP verification and optional Google OAuth. Tokens passed as `Authorization: Bearer …`.
- **Money**: Paystack hosted payments (initialize/verify + verified webhook). Wallet and escrow mutations go through atomic JS helpers (`atomicWalletCredit`, `holdEscrow`, `releaseMilestoneToVendor`). Controllers are responsible for authorization; the helpers are responsible for atomicity.
- **Logging**: `pino` + `pino-http`. JSON in production, pretty-printed in development. Sensitive fields are redacted.
- **Validation**: `zod` schemas per controller, wrapped in a `validate()` middleware.
- **Idempotency**: `Idempotency-Key` header on `POST/PUT/PATCH`. Cached responses are stored in the `idempotency_keys` table and replayed on retry.
- **Error responses**: All errors share the shape `{ success: false, error: { code, message, details? } }`.
- **Frontend**: React + Vite. See `client/README.md` (if present) for details.

---

## CSRF Protection

This API uses **Authorization header** authentication (Bearer tokens), not cookies.
Because session state lives in the Authorization header and not in browser cookies,
traditional CSRF attacks do not apply — browsers do not auto-attach Authorization
headers to cross-origin requests.

If cookie-based authentication is introduced in the future, CSRF tokens via the
`SameSite=Strict` cookie attribute + double-submit cookie pattern must be added.

For state-changing endpoints, the `Idempotency-Key` header is recommended to
prevent duplicate operations on client retries.
