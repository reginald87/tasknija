// Periodic subscription expiry + featured-entitlement sync.
// Marks expired vendor subscriptions and flips `is_featured` on a
// vendor's businesses to match their active plan's `featured` feature.
// Production deployments should switch this to a cron job for execution
// independent of server uptime.

import { prisma } from '../config/prisma.js';
import { checkExpiry } from '../utils/subscriptionData.js';
import { logger } from '../middleware/logger.js';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let timer = null;

async function runSync() {
  try {
    const subs = await checkExpiry();
    logger.info?.({ checked: (subs || []).length }, 'subscription sync completed');
  } catch (err) {
    logger.warn?.({ err }, 'subscription sync threw');
  }
}

export function startSubscriptionSync({
  intervalMs = DEFAULT_INTERVAL_MS,
  runImmediately = false,
} = {}) {
  if (timer) return; // already running

  if (runImmediately) {
    runSync();
  }

  timer = setInterval(runSync, intervalMs);
  if (timer.unref) timer.unref();

  logger.info?.({ intervalMs }, 'subscription sync scheduler started');
}

export function stopSubscriptionSync() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export { runSync };

export default { startSubscriptionSync, stopSubscriptionSync, runSync };
