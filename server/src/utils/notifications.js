// Notification dispatch helper.
// Best-effort insert into `public.notifications`. Logs warnings on failure;
// never throws (callers should not have their main flow blocked by notification failures).

import { prisma } from '../config/prisma.js';
import { logger } from '../middleware/logger.js';

const VALID_TYPES = new Set([
  'deposit_success',
  'escrow_held',
  'milestone_completed',
  'milestone_released',
  'transaction_completed',
  'dispute_raised',
  'dispute_resolved',
  'withdrawal_approved',
  'withdrawal_rejected',
  'business_verified',
  'subscription_active',
  'message_received',
  'generic',
]);

// Event metadata for the legacy 2-arg `notify(eventName, params)` API used by
// dispute/withdrawal/subscription controllers. Maps dotted event names to the
// canonical type + default title/body. Falls back to 'generic' for unknown events.
const EVENT_META = {
  'dispute.raised': {
    type: 'dispute_raised',
    title: 'Dispute raised',
    body: 'A dispute has been raised on one of your transactions.',
    linkFor: (ref) => ref ? `/disputes/${ref}` : '/dashboard',
  },
  'dispute.resolved': {
    type: 'dispute_resolved',
    title: 'Dispute resolved',
    body: 'Your dispute has been resolved by the platform team.',
    linkFor: (ref) => ref ? `/disputes/${ref}` : '/dashboard',
  },
  'withdrawal.requested': {
    type: 'withdrawal_approved',
    title: 'Withdrawal request received',
    body: 'Your withdrawal request is being processed.',
    linkFor: (ref) => ref ? `/withdrawals/${ref}` : '/withdrawals',
  },
  'withdrawal.processed': {
    type: ref => ref && ref.status === 'rejected' ? 'withdrawal_rejected' : 'withdrawal_approved',
    title: (params) => params?.status === 'rejected' ? 'Withdrawal rejected' : 'Withdrawal approved',
    body: (params) => params?.status === 'rejected'
      ? 'Your withdrawal request was rejected. Funds have been returned to your wallet.'
      : 'Your withdrawal has been approved and will be disbursed shortly.',
    linkFor: (ref) => ref ? `/withdrawals/${ref}` : '/withdrawals',
  },
  'subscription.created': {
    type: 'subscription_active',
    title: 'Subscription created',
    body: 'Your subscription has been created and is pending verification.',
    linkFor: (ref) => ref ? `/subscriptions/${ref}` : '/dashboard',
  },
  // Generic alias — if any controller passes a plain event we don't know,
  // still record it as a 'generic' notification rather than dropping it.
  'generic': {
    type: 'generic',
    title: 'Notification',
    body: 'You have a new notification.',
    linkFor: () => '/notifications',
  },
};

/**
 * Resolve event metadata for the legacy notify() API.
 * eventName is a dotted string like 'dispute.raised'.
 */
function resolveEventMeta(eventName) {
  if (EVENT_META[eventName]) return EVENT_META[eventName];
  // Synthesize metadata for unknown events so they still get recorded.
  return {
    type: 'generic',
    title: eventName.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Notification',
    body: `Event: ${eventName}`,
    linkFor: () => '/notifications',
  };
}

/**
 * Send a notification to a user.
 *
 * @param {object} params
 * @param {string} params.userId       — recipient
 * @param {string} params.type         — one of VALID_TYPES
 * @param {string} params.title        — short title (e.g. "Deposit successful")
 * @param {string} params.body         — human-readable message
 * @param {object} [params.data]       — structured context for client
 * @param {string} [params.link]       — client-side route (e.g. "/transactions/123")
 * @returns {Promise<{ id: string } | null>}  — the notification id, or null on failure
 */
export async function sendNotification({ userId, type, title, body, data, link }) {
  if (!userId || !type || !title || !body) {
    logger.warn?.({ userId, type, title, body }, 'sendNotification: missing required fields');
    return null;
  }
  if (!VALID_TYPES.has(type)) {
    logger.warn?.({ type }, 'sendNotification: invalid type');
    return null;
  }

  try {
    const row = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
        link: link || null,
      },
      select: { id: true },
    });

    return row;
  } catch (err) {
    logger.warn?.({ err, userId, type }, 'sendNotification: threw');
    return null;
  }
}

/**
 * Send the same notification to multiple users (e.g. all admins).
 * Returns the count of successful inserts.
 */
export async function sendNotificationToMany(userIds, baseParams) {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;
  const results = await Promise.allSettled(
    userIds.map((userId) => sendNotification({ ...baseParams, userId }))
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
}

/**
 * Legacy 2-arg notify API: `notify(eventName, params)`.
 *
 * Used by dispute/withdrawal/subscription controllers. Maps dotted event names
 * to canonical notification types and auto-derives title/body/link from the
 * event metadata table. Falls through to sendNotification() for the actual insert.
 *
 * @param {string} eventName           — dotted event name (e.g. 'dispute.raised')
 * @param {object} [params]
 * @param {string|null} [params.userId] — recipient; if null/undefined, no-op
 * @param {object} [params.payload]    — context object → stored as `data` JSONB
 * @param {string} [params.referenceId] — used to build a link (e.g. /disputes/{id})
 * @param {string} [params.status]     — for withdrawal.processed; 'approved'|'rejected'
 * @returns {Promise<{ id: string } | null>}
 */
export async function notify(eventName, params = {}) {
  if (!eventName) {
    logger.warn?.({ eventName }, 'notify: missing eventName');
    return null;
  }
  if (!params || !params.userId) {
    // Graceful no-op when no recipient (e.g. system events that haven't
    // identified a target user yet). Not an error — just nothing to do.
    return null;
  }

  const meta = resolveEventMeta(eventName);

  // Some metadata fields can be functions that take params (for dynamic title/body).
  const typeValue = typeof meta.type === 'function' ? meta.type(params) : meta.type;
  const titleValue = typeof meta.title === 'function' ? meta.title(params) : meta.title;
  const bodyValue = typeof meta.body === 'function' ? meta.body(params) : meta.body;
  const linkValue = typeof meta.linkFor === 'function' ? meta.linkFor(params.referenceId) : null;

  return sendNotification({
    userId: params.userId,
    type: typeValue,
    title: titleValue,
    body: bodyValue,
    data: params.payload || {},
    link: linkValue,
  });
}

export default { sendNotification, sendNotificationToMany, notify };
