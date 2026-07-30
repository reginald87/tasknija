# Tasknija

A two-sided marketplace platform connecting customers with local service vendors. Customers can discover businesses, request quotes, fund escrow, and release payments on milestone completion. Vendors manage profiles, quotes, milestones, and payouts. Admins oversee the platform via audit-logged actions.

---

## Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (`npm i -g supabase`) for local DB / migrations
- A Supabase project (free tier is fine for development)

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
# then edit .env with values from your Supabase + Paystack dashboards
```

> See **Secret rotation** below before filling in any value that may have ever been public.

### 3. Link your Supabase project (one-time)

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### 4. Apply database migrations

```bash
supabase db push
```

This applies `supabase/migration_003_critical_fixes.sql` and any prior migrations.

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
| `PORT` | Server port | no (default 5000) |
| `NODE_ENV` | `development` \| `production` \| `test` | yes |
| `SUPABASE_URL` | Project URL | yes |
| `SUPABASE_ANON_KEY` | Public anon key (safe to ship to client) | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, never expose) | yes |
| `SUPABASE_JWT_SECRET` | JWT secret used to verify tokens | yes |
| `PAYSTACK_SECRET_KEY` | Paystack secret (server-only) | yes |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | yes |
| `CLOUDINARY_*` | Cloudinary credentials for image uploads | optional |
| `ALLOWED_ORIGIN` | CORS allowed origin (must not be `*` when credentials are enabled) | yes |
| `CORS_CREDENTIALS` | `true` to send `Access-Control-Allow-Credentials` | no (default `true`) |
| `PLATFORM_FEE_PERCENT` | Platform fee charged on milestone release | no (default `2`) |
| `LOG_LEVEL` | pino log level (`trace` … `fatal`, `silent`) | no (default `info`) |

---

## ⚠️ Secret rotation

If any secret has ever been exposed (committed, leaked in logs, shared in chat, etc.), treat it as compromised and rotate it **immediately** at the source.

### What to rotate

- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET` (will invalidate all sessions)
- `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`
- `CLOUDINARY_API_SECRET`

### How to rotate

1. **Supabase dashboard**:
   - `Settings → API → Generate new service_role / anon keys` (deactivate the old ones).
   - `Settings → API → JWT Secret → Generate a new secret`.
   - Update `.env` (and any deployed env config) with the new values.
   - Restart the server. All existing sessions will need to re-authenticate.
2. **Paystack dashboard**:
   - `Settings → API Keys & Webhooks → Regenerate`.
   - Update `.env` and any deployed env config.
   - Verify the new keys with a test transaction before going live.
3. **Cloudinary dashboard**:
   - `Settings → Security → Regenerate API secret`.
   - Update `.env`.

### After rotating

- Verify webhook signatures still verify (place a test order).
- Confirm logins still work.
- Confirm uploads still succeed.
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

### Strategy A: Supabase Point-in-Time Recovery (recommended)

**Enable PITR in the Supabase dashboard:**

1. Go to `Settings → Database → Point in Time Recovery`.
2. Enable. Note: PITR is a **paid feature** (Pro plan and above).
3. Confirm retention window — Supabase retains WAL for 7 days on Pro, longer on higher tiers.

**Restore procedure (PITR):**

1. Open Supabase dashboard → `Settings → Database → Backups → Restore to a point in time`.
2. Select the target timestamp (within the retention window).
3. Confirm. Supabase creates a new project branch with the data as of that timestamp.
4. Verify the data, then promote the branch to primary or use it for forensic analysis.

**When to use:** any point-in-time recovery within the last 7 days. Fast, no scripting required.

### Strategy B: Self-managed `pg_dump` (fallback)

For projects on the Supabase free tier (no PITR) or for additional off-platform backups:

**1. Install `pg_dump`** — already available via the Postgres client tools on most Linux/macOS systems. On Windows, install via the Postgres installer or `choco install postgresql`.

**2. Create a dedicated backup role** (run once in Supabase SQL editor):

```sql
-- Read-only role for backups. Cannot modify data.
CREATE ROLE backup_reader WITH REPLICATION LOGIN PASSWORD '<generate-strong-password>';
GRANT pg_read_all_data TO backup_reader;
```

Store the password in your secrets manager — **never commit it**.

**3. Daily backup script** (`scripts/backup-db.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

# Required env vars:
#   SUPABASE_DB_HOST       — from Supabase dashboard Settings → Database
#   SUPABASE_DB_PASSWORD   — the backup_reader password from step 2
#   BACKUP_S3_BUCKET       — S3 (or S3-compatible) bucket for backups
#   AWS_ACCESS_KEY_ID      — for the backup upload account
#   AWS_SECRET_ACCESS_KEY  — for the backup upload account

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILENAME="tasknija-${TIMESTAMP}.sql.gz"
LOCAL_PATH="/tmp/${FILENAME}"

# Connection string — Supabase provides this in Settings → Database → Connection string.
export PGPASSWORD="${SUPABASE_DB_PASSWORD}"
CONN="postgresql://backup_reader@${SUPABASE_DB_HOST}:5432/postgres"

# Dump (compressed, includes schema + data).
pg_dump "${CONN}" \
  --no-owner \
  --no-privileges \
  --format=plain \
  --compress=9 \
  --file="${LOCAL_PATH}"

# Upload to encrypted S3 (SSE-S3 or SSE-KMS).
aws s3 cp "${LOCAL_PATH}" "s3://${BACKUP_S3_BUCKET}/daily/${FILENAME}" \
  --sse aws:kms \
  --metadata "timestamp=${TIMESTAMP},source=tasknija"

# Remove local copy.
rm -f "${LOCAL_PATH}"

echo "[backup] ${FILENAME} uploaded to s3://${BACKUP_S3_BUCKET}/daily/${FILENAME}"
```

**4. Schedule the script** — install the script at `/usr/local/bin/tasknija-backup.sh`, then add a cron entry:

```cron
# /etc/cron.d/tasknija-backup
# Daily at 03:00 UTC — adjust timezone if needed.
0 3 * * * root /usr/local/bin/tasknija-backup.sh >> /var/log/tasknija-backup.log 2>&1
```

Or run it from the orchestrator of your choice (Kubernetes CronJob, GitHub Actions on schedule, etc.).

**5. Restore procedure (pg_dump):**

```bash
# Download the backup file.
aws s3 cp s3://tasknija-backups/daily/tasknija-20260703T030000Z.sql.gz /tmp/restore.sql.gz

# Decompress.
gunzip /tmp/restore.sql.gz

# Restore into a target database. **Do not restore into production directly.**
# First restore into a side database for verification.
export PGPASSWORD="${SUPABASE_DB_PASSWORD}"
psql "postgresql://postgres@${SUPABASE_DB_HOST}:5432/postgres_restore" \
  --file=/tmp/restore.sql

# Verify row counts match expectations.
psql "postgresql://postgres@${SUPABASE_DB_HOST}:5432/postgres_restore" -c "
  SELECT
    (SELECT count(*) FROM profiles)        AS profiles,
    (SELECT count(*) FROM businesses)      AS businesses,
    (SELECT count(*) FROM transactions)    AS transactions,
    (SELECT count(*) FROM wallet_transactions) AS wallet_txns;
"

# If counts look right, restore into production (DESTRUCTIVE — replaces all data).
# Schedule a maintenance window first.
psql "postgresql://postgres@${SUPABASE_DB_HOST}:5432/postgres" \
  --file=/tmp/restore.sql
```

### Backup validation

**Monthly restore drill** — restore the most recent daily backup into a side database and verify:

```bash
# 1. Restore into postgres_restore (created above).
# 2. Run sanity queries:
psql "postgresql://postgres@${SUPABASE_DB_HOST}:5432/postgres_restore" -c "
  SELECT
    (SELECT count(*) FROM profiles) AS profiles,
    (SELECT count(*) FROM businesses) AS businesses,
    (SELECT count(*) FROM transactions WHERE status = 'escrow') AS open_escrows,
    (SELECT sum(balance) FROM wallets) AS total_wallet_balance;
"

# 3. Compare with production counts (script that runs both queries and diffs).
# 4. Drop the side database when done.
```

**Document the drill result** in `runbooks/backup-drills.md` (create if absent) with date, backup timestamp restored, row counts, any discrepancies.

### Disaster recovery checklist

When the database is lost/corrupted and needs to be restored:

- [ ] Identify the target restore point (most recent good state).
- [ ] If within PITR window (7 days): use Supabase dashboard → Restore to point in time.
- [ ] If outside PITR window: download most recent `pg_dump` backup from S3.
- [ ] Restore into a side database; verify row counts against expected values.
- [ ] If verified, restore into production during a maintenance window.
- [ ] Rotate all secrets that may have been compromised (see README → Secret rotation).
- [ ] Notify users if data loss occurred.
- [ ] Open a post-mortem doc in `runbooks/incidents/`.

### Backup secrets

The backup workflow needs credentials. Add these to `.env.example`:

```bash
# Database backups (see README → Database backups)
SUPABASE_DB_HOST=db.your-project-ref.supabase.co
SUPABASE_DB_PASSWORD=your-backup-reader-password
BACKUP_S3_BUCKET=your-s3-bucket-name
```

And document in the secret-rotation runbook that the `backup_reader` role password is rotated quarterly.

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
- **Database**: Supabase (Postgres). Access via the service-role client server-side; never expose the service key to the browser.
- **Auth**: Supabase Auth (`supabase.auth.signUp` / `signInWithPassword`). Tokens passed as `Authorization: Bearer …`.
- **Money**: All wallet and escrow mutations go through Postgres functions (`atomic_wallet_credit`, `atomic_wallet_update`, `release_milestone_to_vendor`). Controllers are responsible for authorization; SQL functions are responsible for atomicity.
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
