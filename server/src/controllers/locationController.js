import { prisma } from '../config/prisma.js';
import { sanitizeError } from '../middleware/errorHandler.js';

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeStateName(name) {
  return String(name || 'Nigeria').trim().replace(/\s+State$/i, '').trim();
}

// Distinct (state -> cities) present in the business table. Used as a fallback
// when the reference State/Lga/City tables have not been seeded yet.
async function businessLocations() {
  const rows = await prisma.business.findMany({
    where: { city: { not: null } },
    select: { city: true, state: true },
  });
  const states = new Map(); // stateName -> Set(cityName)
  for (const r of rows || []) {
    if (!r.city) continue;
    const st = normalizeStateName(r.state);
    if (!states.has(st)) states.set(st, new Set());
    states.get(st).add(r.city.trim());
  }
  return states;
}

export async function getStates(req, res, next) {
  try {
    const refStates = await prisma.state.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    if (refStates.length > 0) {
      return res.json({ success: true, data: refStates });
    }
    // Fallback: derive states from business records.
    const biz = await businessLocations();
    const data = [...biz.keys()]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ id: 'st-' + slugify(name), name, slug: slugify(name) }));
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getLgas(req, res, next) {
  try {
    const { stateId } = req.params;
    const data = await prisma.lga.findMany({
      where: { state_id: stateId },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    // Businesses don't track LGAs; if the reference tables are empty the client
    // falls back to free-text entry, so an empty list is the correct fallback.
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getCities(req, res, next) {
  try {
    const { stateId, lgaId } = req.query;
    const where = {};
    if (stateId) where.state_id = stateId;
    if (lgaId) where.lga_id = lgaId;
    const refCities = await prisma.city.findMany({
      where,
      select: { id: true, name: true, slug: true, state_id: true, lga_id: true },
      orderBy: { name: 'asc' },
    });
    if (refCities.length > 0) {
      return res.json({ success: true, data: refCities });
    }
    // Fallback: derive cities from business records.
    const biz = await businessLocations();
    if (stateId && stateId.startsWith('st-')) {
      const slug = stateId.slice(3);
      for (const [st, cities] of biz) {
        if (slugify(st) === slug) {
          const data = [...cities]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
            .map((name) => ({ id: 'city-' + slugify(name), name, slug: slugify(name), state_id: stateId, lga_id: null }));
          return res.json({ success: true, data });
        }
      }
    }
    if (!stateId && !lgaId) {
      const all = new Set();
      for (const cities of biz.values()) {
        for (const c of cities) if (c) all.add(c);
      }
      const data = [...all]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ id: 'city-' + slugify(name), name, slug: slugify(name), state_id: null, lga_id: null }));
      return res.json({ success: true, data });
    }
    return res.json({ success: true, data: [] });
  } catch (err) { next(err); }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function getNearestCity(req, res, next) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'lat and lng required' });
    }
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    if (Number.isNaN(userLat) || Number.isNaN(userLng)) {
      return res.status(400).json({ success: false, error: 'lat and lng must be numeric' });
    }

    const delta = 0.5; // ~50km bounding box
    const candidates = await prisma.city.findMany({
      where: {
        latitude: { gte: userLat - delta, lte: userLat + delta },
        longitude: { gte: userLng - delta, lte: userLng + delta },
      },
      select: { id: true, name: true, state_id: true, lga_id: true, latitude: true, longitude: true },
    });

    let nearest = null;
    if (candidates?.length) {
      nearest = candidates
        .map(c => ({ ...c, distance: haversineKm(userLat, userLng, c.latitude, c.longitude) }))
        .sort((a, b) => a.distance - b.distance)[0];
    } else {
      const businesses = await prisma.business.findMany({
        where: { latitude: { not: null } },
        select: { city: true, state: true, latitude: true, longitude: true },
        take: 500,
      });
      const cityMap = new Map();
      for (const b of businesses || []) {
        if (!b.latitude || !b.longitude || !b.city) continue;
        const key = `${b.city}|${b.state}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            name: b.city,
            state: b.state,
            latitude: b.latitude,
            longitude: b.longitude,
            distance: haversineKm(userLat, userLng, b.latitude, b.longitude),
          });
        }
      }
      nearest = Array.from(cityMap.values()).sort((a, b) => a.distance - b.distance)[0];
    }

    return res.json({ success: true, data: nearest });
  } catch (err) { next(err); }
}

export async function getHierarchy(req, res, next) {
  try {
    const [states, lgas, cities, businessCities] = await Promise.all([
      prisma.state.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } }),
      prisma.lga.findMany({ select: { id: true, name: true, slug: true, state_id: true }, orderBy: { name: 'asc' } }),
      prisma.city.findMany({ select: { id: true, name: true, slug: true, state_id: true, lga_id: true }, orderBy: { name: 'asc' } }),
      prisma.business.findMany({ where: { city: { not: null } }, select: { city: true, state: true } }),
    ]);

    const activeCityNames = new Set(
      (businessCities || []).map(b => b.city?.toLowerCase().trim()).filter(Boolean)
    );

    const lgaMap = {};
    const stateCityMap = {};
    for (const lga of (lgas || [])) {
      const lgaCities = (cities || []).filter(
        c => c.lga_id === lga.id && activeCityNames.has(c.name.toLowerCase().trim())
      );
      if (lgaCities.length === 0) continue;
      if (!lgaMap[lga.state_id]) lgaMap[lga.state_id] = [];
      lgaMap[lga.state_id].push({
        id: lga.id, name: lga.name, slug: lga.slug,
        cities: lgaCities.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
      });
    }

    const hierarchy = (states || [])
      .filter(s => lgaMap[s.id])
      .map(s => ({ id: s.id, name: s.name, slug: s.slug, cities: stateCityMap[s.id] || [], lgas: lgaMap[s.id] }));

    if (hierarchy.length > 0) {
      return res.json({ success: true, data: hierarchy, empty: false });
    }

    // Fallback: reference tables not seeded — derive states/cities from business records.
    const biz = await businessLocations();
    const data = [...biz.entries()]
      .map(([stateName, citySet]) => ({
        id: 'st-' + slugify(stateName),
        name: stateName,
        slug: slugify(stateName),
        lgas: [],
        cities: [...citySet]
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
          .map(cityName => ({ id: 'city-' + slugify(cityName), name: cityName, slug: slugify(cityName) })),
      }))
      .filter(s => s.cities.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json({ success: true, data, empty: data.length === 0 });
  } catch (err) { next(err); }
}
