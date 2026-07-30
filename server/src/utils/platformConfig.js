import { prisma } from '../config/prisma.js';

const DEFAULTS = {
  platform_fee_rate: 5,         // percent
  min_withdrawal: 1000,
  max_withdrawal: 10000000,
  dispute_window_hours: 72,
  vendor_approval_required: true,
};

let cache = null;
let cacheExpires = 0;
const CACHE_TTL = 60_000;

function isCacheValid() {
  return cache !== null && Date.now() < cacheExpires;
}

function parseValue(raw) {
  if (raw === null || raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function serializeValue(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export async function getConfig(key) {
  if (isCacheValid() && cache[key] !== undefined) return cache[key];

  try {
    const row = await prisma.platformConfig.findUnique({ where: { key } });
    if (row) {
      cache = cache || {};
      cache[key] = parseValue(row.value);
      cacheExpires = Date.now() + CACHE_TTL;
      return cache[key];
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULTS[key];
}

export async function getAllConfig() {
  try {
    const rows = await prisma.platformConfig.findMany();
    const merged = { ...DEFAULTS };
    for (const row of rows) {
      if (row.key) merged[row.key] = parseValue(row.value);
    }
    cache = merged;
    cacheExpires = Date.now() + CACHE_TTL;
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setConfig(key, value, adminId = null) {
  if (!key) throw new Error('Config key is required.');
  const serialized = serializeValue(value);
  await prisma.platformConfig.upsert({
    where: { key },
    create: { key, value: serialized, updated_by: adminId },
    update: { value: serialized, updated_by: adminId, updated_at: new Date() },
  });
  cache = null;
  cacheExpires = 0;
}

export function clearCache() {
  cache = null;
  cacheExpires = 0;
}

export function readPlatformConfig() {
  if (isCacheValid()) return { ...cache };
  return { ...DEFAULTS };
}

export function writePlatformConfig(partial) {
  if (!partial || typeof partial !== 'object') return;
  cache = cache ? { ...cache } : { ...DEFAULTS };
  for (const [key, value] of Object.entries(partial)) {
    cache[key] = value;
  }
  cacheExpires = Date.now() + CACHE_TTL;

  (async () => {
    for (const [key, value] of Object.entries(partial)) {
      try {
        await prisma.platformConfig.upsert({
          where: { key },
          create: { key, value: serializeValue(value) },
          update: { value: serializeValue(value), updated_at: new Date() },
        });
      } catch {
        // best-effort
      }
    }
  })();
}
