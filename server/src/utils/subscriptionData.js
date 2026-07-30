import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { logger } from '../middleware/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { ipKeyGenerator } from 'express-rate-limit';

const SEED_PACKAGES = [
  { id: 'basic', name: 'Basic', description: 'Free starter plan', features: ['listing', 'messages'], prices: { quarterly: 0, biannually: 0, annually: 0 }, recommended: false, active: true, tier: 1 },
  { id: 'pro', name: 'Pro', description: 'For active vendors', features: ['listing', 'messages', 'analytics', 'priority_support'], prices: { quarterly: 5000, biannually: 14000, annually: 50000 }, recommended: true, active: true, tier: 2 },
  { id: 'enterprise', name: 'Enterprise', description: 'For high-volume vendors', features: ['listing', 'messages', 'analytics', 'priority_support', 'featured', 'api_access'], prices: { quarterly: 20000, biannually: 55000, annually: 200000 }, recommended: false, active: true, tier: 3 },
];

function j(v) { return v === null || v === undefined ? null : (typeof v === 'string' ? v : JSON.stringify(v)); }
function pj(v) { try { return v === null || v === undefined ? null : JSON.parse(v); } catch { return null; } }

export async function listSubscriptionPackages() {
  try {
    const rows = await prisma.subscriptionPackage.findMany({ orderBy: { name: 'asc' } });
    if (rows.length > 0) {
      return rows.map((r) => ({ ...r, features: pj(r.features) || [], prices: pj(r.prices) || {} }));
    }
    // Seed defaults.
    const seed = SEED_PACKAGES.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      description: p.description,
      features: j(p.features),
      prices: j(p.prices),
      recommended: p.recommended,
      active: p.active,
    }));
    await prisma.subscriptionPackage.createMany({ data: seed });
    const seeded = await prisma.subscriptionPackage.findMany({ orderBy: { name: 'asc' } });
    return seeded.map((r) => ({ ...r, features: pj(r.features) || [], prices: pj(r.prices) || {} }));
  } catch {
    return SEED_PACKAGES;
  }
}

export async function getSubscriptionPackage(id) {
  if (!id) return null;
  try {
    const row = await prisma.subscriptionPackage.findUnique({ where: { id } });
    if (row) return { ...row, features: pj(row.features) || [], prices: pj(row.prices) || {} };
  } catch (err) { logger.warn?.({ err }, 'getSubscriptionPackage failed'); }
  return SEED_PACKAGES.find((p) => p.id === id) || null;
}

function mapRow(r) {
  return {
    id: r.id,
    vendor_id: r.vendor_id,
    package_id: r.package_id,
    package_name: r.package_name || null,
    billing_cycle: r.billing_cycle,
    amount: parseFloat(r.amount_paid ?? r.amount ?? 0),
    amount_paid: parseFloat(r.amount_paid ?? r.amount ?? 0),
    status: r.status,
    starts_at: r.starts_at,
    expires_at: r.expires_at,
    verified_by: r.verified_by,
    verified_at: r.verified_at,
    created_at: r.created_at,
  };
}

export async function readVendorSubs() {
  try {
    const rows = await prisma.vendorSubscription.findMany({ orderBy: { created_at: 'desc' } });
    return rows.map(mapRow);
  } catch {
    return [];
  }
}

export async function writeVendorSubs(subs) {
  if (!Array.isArray(subs)) return;
  for (const s of subs) {
    try {
      await prisma.vendorSubscription.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          vendor_id: s.vendor_id,
          package_id: s.package_id,
          billing_cycle: s.billing_cycle,
          amount_paid: parseFloat(s.amount ?? s.amount_paid ?? 0),
          status: s.status || 'pending',
          starts_at: s.starts_at || s.created_at,
          expires_at: s.expires_at,
          verified_by: s.verified_by || null,
          verified_at: s.verified_at || null,
        },
        update: {
          vendor_id: s.vendor_id,
          package_id: s.package_id,
          billing_cycle: s.billing_cycle,
          amount_paid: parseFloat(s.amount ?? s.amount_paid ?? 0),
          status: s.status || 'pending',
          starts_at: s.starts_at || s.created_at,
          expires_at: s.expires_at,
          verified_by: s.verified_by || null,
          verified_at: s.verified_at || null,
        },
      });
    } catch (err) { logger.warn?.({ err }, 'writeVendorSubs failed'); }
  }
}

export async function insertVendorSub(sub) {
  const created = await prisma.vendorSubscription.create({
    data: {
      id: sub.id,
      vendor_id: sub.vendor_id,
      package_id: sub.package_id,
      billing_cycle: sub.billing_cycle,
      amount_paid: parseFloat(sub.amount ?? sub.amount_paid ?? 0),
      status: sub.status || 'pending',
      starts_at: sub.starts_at || sub.created_at || new Date().toISOString(),
      expires_at: sub.expires_at,
    },
  });
  return mapRow(created);
}

export async function updateVendorSub(id, updates) {
  const payload = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.verified_by !== undefined) payload.verified_by = updates.verified_by;
  if (updates.verified_at !== undefined) payload.verified_at = updates.verified_at;
  if (updates.expires_at !== undefined) payload.expires_at = updates.expires_at;
  payload.updated_at = new Date();

  const updated = await prisma.vendorSubscription.update({ where: { id }, data: payload });
  return mapRow(updated);
}

export async function checkExpiry() {
  const subs = await readVendorSubs();
  const now = Date.now();
  let changed = false;
  const toUpdate = [];
  // vendorId -> Set of feature keys from their active subscription package.
  const vendorFeatures = new Map();
  const activePackages = new Map();

  const packages = await listSubscriptionPackages().catch(() => []);

  for (const s of subs) {
    if (s.status === 'active' && s.expires_at) {
      if (new Date(s.expires_at).getTime() < now) {
        s.status = 'expired';
        changed = true;
        toUpdate.push(s.id);
        continue;
      }
      // Track active sub features per vendor for featured sync.
      if (!vendorFeatures.has(s.vendor_id)) {
        const pkg = (packages || []).find((p) => p.id === s.package_id);
        const feats = pkg && Array.isArray(pkg.features) ? new Set(pkg.features) : new Set();
        vendorFeatures.set(s.vendor_id, feats);
      }
    }
  }
  if (changed) {
    await Promise.all(toUpdate.map((id) => updateVendorSub(id, { status: 'expired' }).catch(() => null)));
  }

  // Sync plan-derived flags from each vendor's active subscription:
  //   - `is_featured` on their businesses (Enterprise `featured`)
  //   - `priority_support` on their Profile (Pro/Enterprise `priority_support`)
  // We only flip rows whose current state disagrees with entitlement,
  // so admin-set featuring is not clobbered by this sync.
  try {
    const businesses = await prisma.business.findMany({
      select: { id: true, owner_id: true, is_featured: true },
    });
    const profiles = await prisma.profile.findMany({
      select: { id: true, priority_support: true },
    });
    const profById = new Map((profiles || []).map((p) => [p.id, p]));

    const toFeature = [];
    const toUnfeature = [];
    const toPriority = [];
    const toUnpriority = [];
    for (const b of businesses || []) {
      const feats = vendorFeatures.get(b.owner_id);
      const shouldFeature = Boolean(feats && feats.has('featured'));
      if (shouldFeature && !b.is_featured) toFeature.push(b.id);
      else if (!shouldFeature && b.is_featured) toUnfeature.push(b.id);

      const prof = profById.get(b.owner_id);
      if (prof) {
        const shouldPriority = Boolean(feats && feats.has('priority_support'));
        if (shouldPriority && !prof.priority_support) toPriority.push(b.owner_id);
        else if (!shouldPriority && prof.priority_support) toUnpriority.push(b.owner_id);
      }
    }
    if (toFeature.length) {
      await prisma.business.updateMany({
        where: { id: { in: toFeature } },
        data: { is_featured: true },
      });
    }
    if (toUnfeature.length) {
      await prisma.business.updateMany({
        where: { id: { in: toUnfeature } },
        data: { is_featured: false },
      });
    }
    if (toPriority.length) {
      await prisma.profile.updateMany({
        where: { id: { in: [...new Set(toPriority)] } },
        data: { priority_support: true },
      });
    }
    if (toUnpriority.length) {
      await prisma.profile.updateMany({
        where: { id: { in: [...new Set(toUnpriority)] } },
        data: { priority_support: false },
      });
    }
  } catch (err) {
    logger.warn?.({ err }, 'feature/flag sync failed');
  }

  return subs;
}

export const readPackages = listSubscriptionPackages;

/**
 * Resolve the active subscription features for a vendor.
 *
 * Reads the vendor's vendorSubscriptions, finds the active (non-expired)
 * one, then looks up that package's `features` array. Returns a Set of
 * feature keys (e.g. 'analytics', 'priority_support', 'featured',
 * 'api_access'). Empty Set if the vendor has no active subscription.
 *
 * This is the single source of truth used to gate plan-restricted
 * functionality (analytics, featured placement, api access, etc.).
 */
export async function getVendorFeatures(vendorId) {
  if (!vendorId) return new Set();
  try {
    const subs = await checkExpiry();
    const active = (subs || []).find(
      (s) => s.vendor_id === vendorId && s.status === 'active'
    );
    if (!active || !active.package_id) return new Set();

    const all = await listSubscriptionPackages();
    const pkg = (all || []).find((p) => p.id === active.package_id);
    if (!pkg || !Array.isArray(pkg.features)) return new Set();
    return new Set(pkg.features);
  } catch (err) {
    logger.warn?.({ err, vendorId }, 'getVendorFeatures failed');
    return new Set();
  }
}

/**
 * Returns true if the vendor holds an active subscription whose package
 * includes every feature in `required`.
 */
export async function vendorHasFeatures(vendorId, required) {
  if (!Array.isArray(required) || required.length === 0) return true;
  const features = await getVendorFeatures(vendorId);
  return required.every((f) => features.has(f));
}

/**
 * Express middleware factory that requires the authenticated vendor to hold
 * an active plan including every feature in `required`. Used to gate plan-only
 * capabilities (e.g. 'api_access') at the route level. Responds 403 with a
 * `PLAN_REQUIRES_*` code (uppercased feature) when the entitlement is missing.
 */
export function requireFeature(required) {
  const list = Array.isArray(required) ? required : [required];
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
      }
      const ok = await vendorHasFeatures(userId, list);
      if (!ok) {
        const code = `PLAN_REQUIRES_${list.map((f) => f.toUpperCase()).join('_')}`;
        return next(
          new AppError(403, code, `This action requires a plan with: ${list.join(', ')}.`)
        );
      }
      return next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Per-vendor API rate limiter. Vendors on a plan that includes `api_access`
 * (Enterprise) get a generous ceiling; everyone else gets throttled to the
 * standard API tier. This enforces the advertised `api_access` entitlement:
 * it both gates the high limit and 403s non-entitled callers on API routes.
 */
export function apiAccessLimiter({ windowMs, entitledMax, standardMax } = {}) {
  const win = windowMs || 15 * 60 * 1000;
  const entitled = entitledMax || 5000;
  const standard = standardMax || 600;
  const store = new Map(); // key -> { count, resetAt }

  return async (req, res, next) => {
    const userId = req.user?.id || ipKeyGenerator(req.ip);
    try {
      const hasAccess = req.user?.id
        ? await vendorHasFeatures(req.user.id, ['api_access'])
        : false;
      const max = hasAccess ? entitled : standard;
      const now = Date.now();
      let entry = store.get(userId);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + win };
        store.set(userId, entry);
      }
      entry.count += 1;
      const remaining = Math.max(0, max - entry.count);
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(remaining));
      if (entry.count > max) {
        return res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
        });
      }
      return next();
    } catch (err) {
      // Fail open to standard tier rather than blocking the request.
      return next();
    }
  };
}


export async function writePackages(packages) {
  if (!Array.isArray(packages)) return;
  for (const pkg of packages) {
    try {
      const id = pkg.id || crypto.randomUUID();
      await prisma.subscriptionPackage.upsert({
        where: { id },
        create: {
          id,
          name: pkg.name,
          description: pkg.description || '',
          features: j(pkg.features || []),
          prices: j(pkg.prices || { quarterly: 0, biannually: 0, annually: 0 }),
          recommended: pkg.recommended || false,
          active: pkg.active !== false,
        },
        update: {
          name: pkg.name,
          description: pkg.description || '',
          features: j(pkg.features || []),
          prices: j(pkg.prices || { quarterly: 0, biannually: 0, annually: 0 }),
          recommended: pkg.recommended || false,
          active: pkg.active !== false,
        },
      });
    } catch (err) { logger.warn?.({ err }, 'seedSubscriptionPackages failed'); }
  }
}
