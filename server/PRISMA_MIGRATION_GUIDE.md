# Supabase -> Prisma Migration Guide (TaskNija server)

We migrated the TaskNija server from Supabase (Postgres) to Prisma + SQLite.
This file is the reference for rewriting controllers/utils. DO NOT use `@supabase/supabase-js`
or import from `../config/supabase.js`. That file no longer exists.

## Prisma client
- Import: `import { prisma } from '../config/prisma.js';`
- Models (camelCase Prisma, snake_case columns in code below are the actual DB field names):
  Profile, Business, Category, Country, State, Lga, City, Review, Conversation, Message,
  Favorite, Wallet, WalletTransaction, Transaction, EscrowMilestone, Dispute,
  VendorVerification, WithdrawalRequest, Notification, Quote, SubscriptionPackage,
  VendorSubscription, WorkProject, WorkUpdate, Report, VendorAvailability,
  VendorBlockedDate, PlatformConfig, AdminAction, IdempotencyKey, FileUpload,
  PasswordReset, AuthUser.

## Field naming
Prisma uses camelCase for model field names. Map snake_case Supabase columns to camelCase:
- `user_id` -> `userId`, `business_id` -> `businessId`, `created_at` -> `createdAt`,
  `verification_status` -> `verificationStatus`, `is_featured` -> `isFeatured`, etc.
- JSON columns are stored as Strings. Serialize with `JSON.stringify` on write, parse with
  `JSON.parse` on read. Affected fields: Business.images, Business.certifications,
  Business.operatingHours, Message.attachments, Quote.terms, Notification.data,
  SubscriptionPackage.features, SubscriptionPackage.prices, PlatformConfig.value,
  AdminAction.metadata, City.latitude/longitude are Float (not JSON).
- Money/numbers are Float. `balance`, `amount`, `platform_fee`, `rating_avg` are Float.

## Query mapping (Supabase -> Prisma)
- `supabase.from('X').select('*')` -> `prisma.<model>.findMany({ select: {...} })` or just
  `findMany({})` to get all columns. For raw all-columns use `findMany()`.
- `.select('a, b')` -> `{ select: { a: true, b: true } }`
- `.eq('col', val)` -> `where: { col: val }`
- `.neq('col', val)` -> `where: { col: { not: val } }`
- `.is('col', null)` -> `where: { col: null }` ; `.not('col','is',null)` -> `where: { col: { not: null } }`
- `.in('col', arr)` -> `where: { col: { in: arr } }`
- `.or('a.eq.x,b.eq.y')` -> `where: { OR: [ {a:x}, {b:y} ] }`
- `.ilike('col', val)` -> `where: { col: { contains: val, mode: 'insensitive' } }`
  (Note: `ilike('city','Lagos')` means substring contains 'Lagos'. For exact match use `equals`.)
- `.order('col', {ascending:false})` -> `orderBy: { col: 'desc' }` (asc is 'asc')
- `.range(from, to)` (0-based inclusive) -> `skip: from, take: (to - from + 1)`
- `.limit(n)` -> `take: n`
- `.single()` -> `findUnique`/`findFirst` returns one object, or `findFirst` + check; if not
  found, Prisma returns null. The old code used PGRST116 (not found). Map: if null, treat as not
  found (return null or throw AppError 404 as the original code did).
- `.maybeSingle()` -> same as single but returns null without throwing (the original never threw
  for maybeSingle).
- `.insert(row)` -> `prisma.<model>.create({ data: row })`. For `.select().single()` after insert,
  use `create({ data, select: {...} })`.
- `.insert([rows])` -> `createMany({ data: rows })` (no return of rows in SQLite; if you need the
  rows back, loop `create` or use `create` per row).
- `.update(patch).eq('id', id)` -> `update({ where: { id }, data: patch })`
- `.delete().eq('id', id)` -> `delete({ where: { id } })`
- `.upsert(row, {onConflict:'id'})` -> `upsert({ where: { id: row.id }, create: row, update: row })`
- `.count('exact')` -> use `findMany({ where })` then `.length`, OR `count({ where })`. Prisma
  `count()` returns a number. For pagination `count: true` in supabase == `const total = await
  prisma.X.count({ where })`.

## Relations / joins
Prisma returns nested relations via `include`. e.g.:
`prisma.business.findMany({ include: { category: true, owner: true } })`.
The old code used fkey aliases like `owner:profiles!businesses_owner_id_fkey(...)`. In Prisma the
relation name matches the field on the model (e.g. `owner`, `category`). Use `include` with the
relation field name. To include a count of a relation use `include: { reviews: { select: { _count: true } } }`
or simpler: `include: { _count: { select: { reviews: true } } }`.

IMPORTANT: When the old code did `select: '*, category:categories(name, slug)'`, that means:
include category with selected fields. Write:
`prisma.business.findMany({ include: { category: { select: { name: true, slug: true } } } })`.

## RPC functions replaced
Do NOT call `supabase.rpc(...)`. Use these helpers from `../utils/wallet.js`:
- `holdEscrow({ customerId, businessId, amount, platformFee, conversationId, quoteId })` -> returns txn row.
- `releaseMilestoneToVendor({ milestoneId })` -> returns milestone row.
- `atomicWalletUpdate({ userId, delta, kind, referenceId, referenceType, description })` -> returns wallet row. Throws Error('insufficient_balance') (code P0001) or Error('wallet_not_found') (code P0002).
- `atomicWalletCredit({ userId, amount, referenceId, referenceType, description })` -> returns { balance, wallet, duplicate }.

These throw plain Errors with `.code` set. In catch blocks, check:
`if (/insufficient_balance/.test(err.message))` -> 400 INSUFFICIENT_BALANCE.
`if (err.code === 'P0002')` -> 404 (wallet/business not found).

## Error handling
- Replace `if (error) return next(error)` / `throw error` patterns. After a Prisma call, if it
  throws, let it propagate to the central error handler (do `catch (err) { next(err); }` already
  present, or just let it throw). Do NOT check a fake `error` variable. Remove `const { data, error } = await ...`.
- For unique violations (P2002) that the old code mapped to code '23505' (e.g. favorites
  duplicate, idempotency), catch `if (err.code === 'P2002')` and throw the appropriate AppError
  (e.g. 409 ALREADY_FAVORITED). Use `prismaErrorCode(err)` from config/prisma.js if helpful.
- For "not found" (P2025) map similarly.

## Auth
- `req.user` is the Profile row (has id, email, role, full_name, etc.).
- Don't call `supabase.auth.*` anywhere.

## JSON helpers
Define small local helpers if needed:
```js
const j = (v) => (v == null ? null : (typeof v === 'string' ? v : JSON.stringify(v)));
const pj = (v) => { try { return v == null ? null : JSON.parse(v); } catch { return null; } };
```
Business.images and certifications are JSON strings in DB but the API returns them as arrays —
when reading a Business, the client expects arrays. So parse them on read. To keep responses
identical to before, add a `serializeBusiness(b)` style helper that does
`b.images = pj(b.images) || []; b.certifications = pj(b.certifications) || [];` and similar for
operatingHours. Documents/quotes do the same for `terms` and `attachments`.

## General rules
1. Keep the same exported function names and response shapes (`{ success: true, data, ... }`).
2. Keep pagination shapes (`pagination: { page, limit, total, totalPages }` or `total`).
3. Preserve authorization checks (owner/admin) using `req.user`.
4. Do NOT change routes. Only rewrite controller bodies.
5. Remove `import { supabase } ...`. Add `import { prisma } from '../config/prisma.js';`.
6. If a controller needs wallet/escrow helpers, import from `../utils/wallet.js`.
7. For `notifications` inserts use `../utils/notifications.js` (unchanged API: sendNotification /
   notify). That util will be migrated separately to Prisma; keep calling it the same way.
8. For admin audit use `logAdminAction` from `../utils/adminAudit.js` (will be migrated to Prisma).
9. For platform config use `getConfig`/`getAllConfig`/`setConfig` from `../utils/platformConfig.js`.
10. For escrow milestones use `getMilestones`/`setMilestones`/`updateMilestoneStatus` from
    `../utils/escrowMilestones.js` (will be migrated to Prisma).
