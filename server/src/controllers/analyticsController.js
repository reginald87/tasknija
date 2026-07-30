/**
 * Vendor analytics controllers (chunk 8b).
 *
 *   GET /api/analytics/vendor/overview     -> getVendorOverview
 *   GET /api/analytics/vendor/revenue      -> getVendorRevenue
 *   GET /api/analytics/vendor/customers    -> getVendorCustomers
 *   GET /api/businesses/:id/response-time  -> getBusinessResponseTime (public)
 *
 * Note: `messages.sender_role` does NOT exist in the schema (chunk 8b spec
 * assumed it did). For response-time we infer sender_role from the conversation
 * participants (customer vs vendor) instead.
 */

import { prisma } from '../config/prisma.js';
import { vendorHasFeatures } from '../utils/subscriptionData.js';
import { AppError } from '../middleware/errorHandler.js';

async function resolveVendorBusinessIds(userId) {
  const rows = await prisma.business.findMany({
    where: { owner_id: userId },
    select: { id: true },
  });
  return (rows || []).map((b) => b.id);
}

// Analytics is a paid feature. Gate it on the vendor's active subscription
// including the 'analytics' feature (Pro/Enterprise plans).
async function requireAnalytics(req, res) {
  const entitled = await vendorHasFeatures(req.user.id, ['analytics']);
  if (!entitled) {
    throw new AppError(
      403,
      'PLAN_REQUIRES_ANALYTICS',
      'Your current plan does not include analytics. Upgrade to the Pro or Enterprise plan to view vendor analytics.'
    );
  }
}

const EMPTY_OVERVIEW = {
  totalRevenue: 0,
  transactionCount: 0,
  avgRating: 0,
  conversionRate: 0,
};

export async function getVendorOverview(req, res, next) {
  try {
    await requireAnalytics(req, res);
    const businessIds = await resolveVendorBusinessIds(req.user.id);
    if (businessIds.length === 0) {
      return res.json({ success: true, data: EMPTY_OVERVIEW });
    }

    // Total revenue from released milestones (amount - platform_fee)
    const milestones = await prisma.escrowMilestone.findMany({
      where: {
        status: 'released',
        transaction: { business_id: { in: businessIds } },
      },
      select: { amount: true, platform_fee: true },
    });

    const totalRevenue = (milestones || []).reduce(
      (sum, m) => sum + (Number(m.amount || 0) - Number(m.platform_fee || 0)),
      0
    );

    // Transaction count
    const txCount = await prisma.transaction.count({
      where: { business_id: { in: businessIds } },
    });

    // Avg rating across vendor's businesses
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { rating_avg: true },
    });

    const avgRating = businesses && businesses.length
      ? businesses.reduce((s, b) => s + Number(b.rating_avg || 0), 0) / businesses.length
      : 0;

    return res.json({
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        transactionCount: txCount || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        conversionRate: 0, // TODO: requires inquiry→transaction tracking (not in schema yet)
      },
    });
  } catch (err) {
    next(err);
  }
}

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

export async function getVendorRevenue(req, res, next) {
  try {
    await requireAnalytics(req, res);
    const businessIds = await resolveVendorBusinessIds(req.user.id);
    const period = req.query.period || '30d';
    const days = PERIOD_DAYS[period] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (businessIds.length === 0) {
      return res.json({ success: true, data: { period, series: [] } });
    }

    const data = await prisma.escrowMilestone.findMany({
      where: {
        status: 'released',
        released_at: { gte: since },
        transaction: { business_id: { in: businessIds } },
      },
      select: { amount: true, platform_fee: true, released_at: true },
      orderBy: { released_at: 'asc' },
    });

    const byDay = {};
    for (const m of data || []) {
      const day = String(m.released_at).slice(0, 10);
      byDay[day] = (byDay[day] || 0) + (Number(m.amount || 0) - Number(m.platform_fee || 0));
    }
    const series = Object.entries(byDay)
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return res.json({ success: true, data: { period, series } });
  } catch (err) {
    next(err);
  }
}

export async function getVendorCustomers(req, res, next) {
  try {
    await requireAnalytics(req, res);
    const businessIds = await resolveVendorBusinessIds(req.user.id);
    if (businessIds.length === 0) {
      return res.json({
        success: true,
        data: { totalCustomers: 0, repeatCustomers: 0, repeatRate: 0 },
      });
    }

    const txs = await prisma.transaction.findMany({
      where: { business_id: { in: businessIds } },
      select: { customer_id: true },
    });

    const customerCounts = {};
    for (const tx of txs || []) {
      if (!tx.customer_id) continue;
      customerCounts[tx.customer_id] = (customerCounts[tx.customer_id] || 0) + 1;
    }
    const total = Object.keys(customerCounts).length;
    const repeat = Object.values(customerCounts).filter((c) => c > 1).length;
    return res.json({
      success: true,
      data: {
        totalCustomers: total,
        repeatCustomers: repeat,
        repeatRate: total ? Math.round((repeat / total) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Platform-wide analytics for the admin dashboard. Not gated by any vendor
 * plan — admins always see aggregate metrics. Returns headline KPIs, a
 * revenue time-series, top categories and recent growth counters.
 */
export async function getAdminAnalytics(req, res, next) {
  try {
    const period = req.query.period || '30d';
    const days = PERIOD_DAYS[period] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalBusinesses,
      totalUsers,
      totalVendors,
      totalTransactions,
      totalDisputes,
      totalReviews,
      totalSubs,
      activeSubs,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.profile.count(),
      prisma.profile.count({ where: { role: 'vendor' } }),
      prisma.transaction.count(),
      prisma.dispute.count(),
      prisma.review.count(),
      prisma.vendorSubscription.count(),
      prisma.vendorSubscription.count({ where: { status: 'active' } }),
    ]);

    // Released milestone revenue (net of platform fee) for the period.
    const released = await prisma.escrowMilestone.findMany({
      where: {
        status: 'released',
        released_at: { gte: since },
      },
      select: { amount: true, platform_fee: true, released_at: true },
      orderBy: { released_at: 'asc' },
    });
    const revenueSeries = {};
    let grossRevenue = 0;
    let platformFees = 0;
    for (const m of released || []) {
      const net = Number(m.amount || 0) - Number(m.platform_fee || 0);
      grossRevenue += Number(m.amount || 0);
      platformFees += Number(m.platform_fee || 0);
      const day = String(m.released_at).slice(0, 10);
      revenueSeries[day] = (revenueSeries[day] || 0) + net;
    }
    const series = Object.entries(revenueSeries)
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    // Top categories by business count.
    const categories = await prisma.category.findMany({
      select: { name: true, _count: { select: { businesses: true } } },
      orderBy: { businesses: { _count: 'desc' } },
      take: 5,
    });

    // Growth: new users / businesses in the period.
    const [newUsers, newBusinesses] = await Promise.all([
      prisma.profile.count({ where: { created_at: { gte: since } } }),
      prisma.business.count({ where: { created_at: { gte: since } } }),
    ]);

    return res.json({
      success: true,
      data: {
        period,
        kpis: {
          totalBusinesses,
          totalUsers,
          totalVendors,
          totalTransactions,
          totalDisputes,
          totalReviews,
          totalSubs,
          activeSubs,
          grossRevenue: Math.round(grossRevenue * 100) / 100,
          platformFees: Math.round(platformFees * 100) / 100,
        },
        revenueSeries: series,
        topCategories: (categories || []).map((c) => ({
          name: c.name,
          businesses: c._count.businesses,
        })),
        growth: { newUsers, newBusinesses },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBusinessResponseTime(req, res, next) {
  try {
    const { id: businessId } = req.params;

    const convs = await prisma.conversation.findMany({
      where: { business_id: businessId },
      select: { id: true, customer_id: true, vendor_id: true },
    });

    let totalMinutes = 0;
    let responseCount = 0;

    for (const conv of convs || []) {
      const msgs = await prisma.message.findMany({
        where: { conversation_id: conv.id },
        select: { sender_id: true, created_at: true },
        orderBy: { created_at: 'asc' },
      });

      let lastCustomerTime = null;
      for (const msg of msgs || []) {
        if (msg.sender_id === conv.customer_id) {
          lastCustomerTime = new Date(msg.created_at);
        } else if (msg.sender_id === conv.vendor_id && lastCustomerTime) {
          const diff = (new Date(msg.created_at) - lastCustomerTime) / 60000;
          // Ignore outliers > 1 week and < 0 (race condition)
          if (diff > 0 && diff < 60 * 24 * 7) {
            totalMinutes += diff;
            responseCount++;
          }
          lastCustomerTime = null;
        }
      }
    }

    const avgMinutes = responseCount ? Math.round(totalMinutes / responseCount) : null;
    return res.json({
      success: true,
      data: { avgResponseMinutes: avgMinutes, sampleSize: responseCount },
    });
  } catch (err) {
    next(err);
  }
}
