import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../middleware/logger.js';
import { notify } from '../utils/notifications.js';
import { verifyPayment } from '../utils/paystack.js';
import { sendSubscriptionReceipt } from '../utils/email.js';
import {
  listSubscriptionPackages,
  getSubscriptionPackage,
  readVendorSubs,
  writeVendorSubs,
  checkExpiry,
  insertVendorSub,
  updateVendorSub,
} from '../utils/subscriptionData.js';

const DURATION_DAYS = {
  quarterly: 90,
  biannually: 180,
  annually: 365,
};

export async function getPackages(req, res, next) {
  try {
    const { id } = req.params;
    if (id) {
      const pkg = await getSubscriptionPackage(id);
      if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });
      return res.json({ success: true, data: pkg });
    }
    const packages = await listSubscriptionPackages();
    res.json({ success: true, data: packages });
  } catch (err) {
    next(err);
  }
}

export async function createPackage(req, res, next) {
  try {
    const { name, description, features, prices, recommended } = req.body;
    if (!name || !prices) {
      return res.status(400).json({ success: false, error: 'Name and prices are required' });
    }
    const id = crypto.randomUUID();
    const pkgPrices = {
      quarterly: parseFloat(prices.quarterly) || 0,
      biannually: parseFloat(prices.biannually) || 0,
      annually: parseFloat(prices.annually) || 0,
    };

    const data = await prisma.subscriptionPackage.create({
      data: {
        id,
        name,
        description: description || '',
        features: JSON.stringify(features || []),
        prices: JSON.stringify(pkgPrices),
        recommended: !!recommended,
        active: true,
      },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePackage(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, features, prices, recommended, active } = req.body;

    // If id is not a valid UUID, try to find the package by name instead.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      const all = await listSubscriptionPackages();
      const found = all.find((p) => p.id === id || p.name.toLowerCase() === id.toLowerCase());
      if (!found) {
        return res.status(404).json({ success: false, error: 'Package not found' });
      }
      // Re-run with the real DB id
      req.params.id = found.id;
      return updatePackage(req, res, next);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (features !== undefined) updates.features = JSON.stringify(features || []);
    if (prices !== undefined) {
      const existing = await prisma.subscriptionPackage.findUnique({
        where: { id },
        select: { prices: true },
      });
      const existingPrices = existing?.prices ? JSON.parse(existing.prices) : {};
      updates.prices = JSON.stringify({
        quarterly: parseFloat(prices.quarterly) || existingPrices.quarterly || 0,
        biannually: parseFloat(prices.biannually) || existingPrices.biannually || 0,
        annually: parseFloat(prices.annually) || existingPrices.annually || 0,
      });
    }
    if (recommended !== undefined) updates.recommended = recommended;
    if (active !== undefined) updates.active = active;
    updates.updated_at = new Date();

    const data = await prisma.subscriptionPackage.update({
      where: { id },
      data: updates,
    }).catch(() => null);

    if (!data) return res.status(404).json({ success: false, error: 'Package not found' });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deletePackage(req, res, next) {
  try {
    const { id } = req.params;
    try {
      await prisma.subscriptionPackage.delete({ where: { id } });
    } catch (err) {
      if (err?.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Package not found' });
      }
      throw err;
    }
    res.json({ success: true, message: 'Package deleted' });
  } catch (err) {
    next(err);
  }
}

export async function subscribe(req, res, next) {
  try {
    const { packageId, billingCycle, paymentProofUrl } = req.body;
    const vendorId = req.user.id;

    if (!packageId || !billingCycle) {
      return res.status(400).json({ success: false, error: 'Package ID and billing cycle are required' });
    }
    if (!DURATION_DAYS[billingCycle]) {
      return res.status(400).json({ success: false, error: 'Invalid billing cycle' });
    }

    const packages = await listSubscriptionPackages();
    const pkg = packages.find((p) => p.id === packageId && p.active);
    if (!pkg) return res.status(404).json({ success: false, error: 'Package not found or inactive' });

    const amount = pkg.prices?.[billingCycle];
    if (amount === undefined || amount === null || amount < 0) {
      return res.status(400).json({ success: false, error: 'Invalid price for selected billing cycle' });
    }

    const subs = await readVendorSubs();
    if (subs.find((s) => s.vendor_id === vendorId && s.status === 'active')) {
      return res.status(400).json({ success: false, error: 'You already have an active subscription' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DURATION_DAYS[billingCycle] * 86400000).toISOString();

    const isFree = amount === 0;

    const sub = {
      id: crypto.randomUUID(),
      vendor_id: vendorId,
      package_id: packageId,
      package_name: pkg.name,
      billing_cycle: billingCycle,
      amount,
      status: isFree ? 'active' : 'pending',
      payment_proof_url: paymentProofUrl || null,
      created_at: now.toISOString(),
      starts_at: now.toISOString(),
      expires_at: expiresAt,
      verified_by: null,
      verified_at: isFree ? now.toISOString() : null,
    };

    await writeVendorSubs([...subs, sub]);

    const stored = await insertVendorSub(sub).catch(() => sub);

    notify(
      'subscription.created',
      { userId: vendorId, payload: { vendorId }, referenceId: stored.id }
    ).catch(() => {});

    res.status(201).json({ success: true, data: stored });
  } catch (err) {
    next(err);
  }
}

export async function initializeSubscription(req, res, next) {
  try {
    const { packageId, billingCycle } = req.body;
    const vendorId = req.user.id;

    if (!packageId || !billingCycle) {
      throw new AppError(400, 'VALIDATION', 'Package ID and billing cycle are required');
    }
    if (!DURATION_DAYS[billingCycle]) {
      throw new AppError(400, 'VALIDATION', 'Invalid billing cycle');
    }

    const packages = await listSubscriptionPackages();
    const pkg = packages.find((p) => p.id === packageId && p.active);
    if (!pkg) throw new AppError(404, 'NOT_FOUND', 'Package not found or inactive');

    const amount = pkg.prices?.[billingCycle];
    if (amount === undefined || amount === null || amount < 0) {
      throw new AppError(400, 'INVALID_PRICE', 'Invalid price for selected billing cycle');
    }

    const subs = await readVendorSubs();
    if (subs.find((s) => s.vendor_id === vendorId && s.status === 'active')) {
      throw new AppError(400, 'ALREADY_ACTIVE', 'You already have an active subscription');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DURATION_DAYS[billingCycle] * 86400000).toISOString();
    const subId = crypto.randomUUID();
    const reference = `SUB-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const isFree = amount === 0;

    if (isFree) {
      const sub = {
        id: subId,
        vendor_id: vendorId,
        package_id: packageId,
        package_name: pkg.name,
        billing_cycle: billingCycle,
        amount: 0,
        status: 'active',
        payment_reference: reference,
        created_at: now.toISOString(),
        starts_at: now.toISOString(),
        expires_at: expiresAt,
        verified_by: null,
        verified_at: now.toISOString(),
      };

      await writeVendorSubs([...subs, sub]);
      await insertVendorSub(sub).catch(() => {});

      notify(
        'subscription.created',
        { userId: vendorId, payload: { vendorId }, referenceId: subId }
      ).catch(() => {});

      return res.json({
        success: true,
        data: {
          authorization_url: null,
          reference,
          subscription_id: subId,
          status: 'active',
          message: 'Free subscription activated immediately.',
        },
      });
    }

    const { initializeSubscriptionPayment } = await import('../utils/paystack.js');
    const response = await initializeSubscriptionPayment({
      email,
      amount,
      reference,
      userId: vendorId,
      subscriptionId: subId,
      packageName: pkg.name,
      billingCycle,
    });

    if (!response || !response.status) {
      throw new AppError(502, 'PAYSTACK_INIT_FAILED', response?.message || 'Payment initialization failed');
    }

    const sub = {
      id: subId,
      vendor_id: vendorId,
      package_id: packageId,
      package_name: pkg.name,
      billing_cycle: billingCycle,
      amount,
      status: 'pending',
      payment_reference: reference,
      created_at: now.toISOString(),
      starts_at: now.toISOString(),
      expires_at: expiresAt,
      verified_by: null,
      verified_at: null,
    };

    await writeVendorSubs([...subs, sub]);
    await insertVendorSub(sub).catch(() => {});

    return res.json({
      success: true,
      data: {
        authorization_url: response.data.authorization_url,
        reference,
        subscription_id: subId,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifySubscriptionPayment(req, res, next) {
  try {
    const { reference } = req.query;
    if (!reference) {
      throw new AppError(400, 'MISSING_REFERENCE', 'Payment reference is required');
    }

    const response = await verifyPayment(reference);
    if (!response || !response.status) {
      throw new AppError(502, 'PAYSTACK_VERIFY_FAILED', response?.message || 'Payment verification failed');
    }

    const { data } = response;

    if (data.status !== 'success') {
      return res.json({
        success: true,
        data: { status: data.status, message: `Payment status: ${data.status}` },
      });
    }

    const metadata = data.metadata || {};
    const subscriptionId = metadata.subscriptionId;

    if (!subscriptionId) {
      throw new AppError(400, 'MISSING_SUBSCRIPTION', 'Subscription ID not found in payment metadata');
    }

    // Activate the subscription
    const updated = await updateVendorSub(subscriptionId, {
      status: 'active',
      verified_at: new Date().toISOString(),
    }).catch(() => null);

    if (!updated) {
      // Subscription may already be active (idempotent call)
      throw new AppError(404, 'NOT_FOUND', 'Subscription not found or already activated');
    }

    // Email a subscription payment receipt (no-op if SMTP not configured).
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: updated.vendor_id },
        select: { email: true, full_name: true },
      });
      if (profile?.email) {
        await sendSubscriptionReceipt({
          email: profile.email,
          name: profile.full_name || '',
          packageName: updated.package_name || 'Subscription',
          billingCycle: updated.billing_cycle || '',
          amount: Number(updated.amount) || 0,
          reference: data.reference || '',
        });
      }
    } catch (mailErr) {
      logger.warn?.({ err: mailErr }, 'subscription receipt email failed');
    }

    return res.json({
      success: true,
      data: { status: 'success', subscription: updated },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMySubscription(req, res, next) {
  try {
    const vendorId = req.user.id;
    const subs = await checkExpiry();
    const mySubs = subs
      .filter((s) => s.vendor_id === vendorId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: mySubs });
  } catch (err) {
    next(err);
  }
}

export async function getAllSubscriptions(req, res, next) {
  try {
    const subs = await checkExpiry();
    const sorted = [...subs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const vendorIds = [...new Set(sorted.map((s) => s.vendor_id))];
    const profiles = await prisma.profile.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, full_name: true, email: true },
    });
    const profileMap = {};
    if (profiles) profiles.forEach((p) => { profileMap[p.id] = p; });

    const enriched = sorted.map((s) => ({
      ...s,
      vendor_name: profileMap[s.vendor_id]?.full_name || '',
      vendor_email: profileMap[s.vendor_id]?.email || '',
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function verifySubscription(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const updated = await updateVendorSub(id, {
      status: 'active',
      verified_by: adminId,
      verified_at: new Date().toISOString(),
    }).catch(() => null);
    if (!updated) return res.status(404).json({ success: false, error: 'Subscription not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function rejectSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await updateVendorSub(id, { status: 'rejected' }).catch(() => null);
    if (!updated) return res.status(404).json({ success: false, error: 'Subscription not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
