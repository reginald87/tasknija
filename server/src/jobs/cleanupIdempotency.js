// Daily cleanup of idempotency_keys older than IDEMPOTENCY_RETENTION_DAYS
// (default 7). Deletes rows via Prisma deleteMany and logs the deleted
// row count. Production deployments should switch this to a cron job
// for guaranteed execution independent of server uptime.

import { prisma } from '../config/prisma.js';
import { logger } from '../middleware/logger.js';

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_RETENTION_DAYS = 7;

let timer = null;

async function runCleanup() {
  const retentionDays = parseInt(process.env.IDEMPOTENCY_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS;

  try {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    const { count } = await prisma.idempotencyKey.deleteMany({
      where: { created_at: { lt: cutoff } },
    });

    logger.info?.({ deletedRows: count, retentionDays }, 'idempotency cleanup completed');
  } catch (err) {
    logger.warn?.({ err, retentionDays }, 'idempotency cleanup threw');
  }
}

export function startIdempotencyCleanup({
  intervalMs = DEFAULT_INTERVAL_MS,
  runImmediately = false,
} = {}) {
  if (timer) return; // already running

  if (runImmediately) {
    runCleanup();
  }

  timer = setInterval(runCleanup, intervalMs);
  // Don't keep the event loop alive on shutdown.
  if (timer.unref) timer.unref();

  logger.info?.({ intervalMs, retentionDays: parseInt(process.env.IDEMPOTENCY_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS }, 'idempotency cleanup scheduler started');
}

export function stopIdempotencyCleanup() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export { runCleanup }; // exported for testing

export default { startIdempotencyCleanup, stopIdempotencyCleanup, runCleanup };
