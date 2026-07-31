import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { getServiceTerms, setServiceTerms, deleteBusinessMeta } from '../utils/businessMeta.js';
import { readVendorSubs, writeVendorSubs } from '../utils/subscriptionData.js';
import { sanitizeObject } from '../utils/sanitize.js';
import { serializeBusiness, serializeBusinesses, stringifyJson } from '../utils/serializers.js';
import crypto from 'crypto';

const BUSINESS_UPDATE_FIELDS = [
  'name', 'description', 'address', 'city', 'state', 'country',
  'latitude', 'longitude', 'phone', 'email', 'website',
  'images', 'category_id', 'service_terms', 'operating_hours',
  'whatsapp', 'instagram', 'facebook',
  'is_direct_from_owner',
  'availability_status',
  // Property/listing fields
  'listing_type', 'price', 'price_type', 'currency', 'condition',
  'property_type', 'bedrooms', 'bathrooms', 'area_sqm', 'year_built', 'furnished',
  'vehicle_type', 'fuel_type', 'transmission', 'mileage', 'year_of_manufacture',
  'attributes',
];

const FORBIDDEN_UPDATE_FIELDS = [
  'verification_status', 'is_verified', 'is_featured', 'is_recommended',
  'rating_avg', 'rating_count', 'rating_sum',
  'owner_id', 'user_id', 'id', 'created_at', 'updated_at',
];

const ADMIN_ONLY_FIELDS = [
  'verification_status', 'is_verified', 'is_featured', 'is_recommended',
];

export const businessUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().regex(/^[\d\s+()-]{7,20}$/, 'Invalid phone format.').optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  images: z.array(z.string().max(500)).max(10).optional(),
  category_id: z.string().uuid().optional(),
  service_terms: z.string().max(5000).optional(),
  operating_hours: z.record(
    z.string(),
    z.object({
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
    })
  ).optional(),
  whatsapp: z.string().regex(/^[\d\s+()-]{7,20}$/).optional(),
  instagram: z.string().max(100).optional(),
  facebook: z.string().url().optional(),
  availability_status: z.enum(['available', 'sold', 'rented']).optional(),
  // Property/listing fields
  listing_type: z.enum(['sale', 'rent', 'lease']).optional(),
  price: z.coerce.number().min(0).optional(),
  price_type: z.enum(['fixed', 'negotiable', 'call_for_price']).optional(),
  currency: z.string().max(10).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  property_type: z.string().max(100).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  area_sqm: z.coerce.number().min(0).optional(),
  year_built: z.coerce.number().int().min(1800).max(2100).optional(),
  furnished: z.boolean().optional(),
  vehicle_type: z.string().max(100).optional(),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  mileage: z.coerce.number().int().min(0).optional(),
  year_of_manufacture: z.coerce.number().int().min(1880).max(2100).optional(),
  attributes: z.record(z.unknown()).optional(),
}).strict();

export const businessCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().regex(/^[\d\s+()-]{7,20}$/).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  images: z.array(z.string().max(500)).max(10).optional(),
  certifications: z.array(z.string()).max(20).optional(),
  is_direct_from_owner: z.boolean().optional(),
  // Property/listing fields
  listing_type: z.enum(['sale', 'rent', 'lease']).optional(),
  price: z.coerce.number().min(0).optional(),
  price_type: z.enum(['fixed', 'negotiable', 'call_for_price']).optional(),
  currency: z.string().max(10).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  property_type: z.string().max(100).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  area_sqm: z.coerce.number().min(0).optional(),
  year_built: z.coerce.number().int().min(1800).max(2100).optional(),
  furnished: z.boolean().optional(),
  vehicle_type: z.string().max(100).optional(),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  mileage: z.coerce.number().int().min(0).optional(),
  year_of_manufacture: z.coerce.number().int().min(1880).max(2100).optional(),
  attributes: z.record(z.unknown()).optional(),
}).strict();

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) {
      out[k] = obj[k];
    }
  }
  return out;
}

function stripAdminFields(business, viewerId, isAdmin) {
  if (!business) return business;
  if (isAdmin || business.owner_id === viewerId) return business;
  const stripped = { ...business };
  for (const f of ADMIN_ONLY_FIELDS) delete stripped[f];
  return stripped;
}

async function getActiveVendorIds() {
  const subs = await readVendorSubs();
  if (subs.length === 0) return null;
  const now = Date.now();
  let changed = false;
  const activeIds = subs.reduce((acc, s) => {
    if (s.status === 'active') {
      if (s.expires_at && new Date(s.expires_at).getTime() < now) {
        s.status = 'expired';
        changed = true;
        return acc;
      }
      acc.add(s.vendor_id);
    }
    return acc;
  }, new Set());
  if (changed) await writeVendorSubs(subs);
  if (activeIds.size === 0) return null;
  return activeIds;
}

export async function getAll(req, res, next) {
  try {
    const { featured, recommended, category, search, city, lat, lng, radius, verified,
            listing_type, min_price, max_price, condition, property_type, bedrooms, bathrooms,
            furnished, vehicle_type, fuel_type, transmission, min_mileage, max_mileage,
            min_year, max_year, sort, listed_within } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const where = { NOT: { verification_status: 'rejected' } };
    if (featured === 'true') where.is_featured = true;
    if (recommended === 'true') where.is_recommended = true;
    if (verified === 'true') where.verification_status = 'verified';
    if (city && city !== 'All Nigeria') where.city = { contains: city, mode: 'insensitive' };
    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category }, select: { id: true } });
      if (!cat) throw new AppError(404, 'CATEGORY_NOT_FOUND', `Category '${category}' does not exist.`);
      where.category_id = cat.id;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }
    // Property/listing specific filters
    if (listing_type) where.listing_type = listing_type;
    if (condition) where.condition = condition;
    if (property_type) where.property_type = property_type;
    if (bedrooms) where.bedrooms = { gte: parseInt(bedrooms) };
    if (bathrooms) where.bathrooms = { gte: parseInt(bathrooms) };
    if (furnished === 'true') where.furnished = true;
    if (vehicle_type) where.vehicle_type = vehicle_type;
    if (fuel_type) where.fuel_type = fuel_type;
    if (transmission) where.transmission = transmission;
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = parseFloat(min_price);
      if (max_price) where.price.lte = parseFloat(max_price);
    }
    if (min_mileage || max_mileage) {
      where.mileage = {};
      if (min_mileage) where.mileage.gte = parseInt(min_mileage);
      if (max_mileage) where.mileage.lte = parseInt(max_mileage);
    }
    if (min_year || max_year) {
      where.year_of_manufacture = {};
      if (min_year) where.year_of_manufacture.gte = parseInt(min_year);
      if (max_year) where.year_of_manufacture.lte = parseInt(max_year);
    }
    // "Recently listed" quick filter: only listings created within the given
    // number of days (e.g. 7, 30, 90).
    const days = parseInt(listed_within);
    if (Number.isFinite(days) && days > 0) {
      where.created_at = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    const orderBy = (() => {
      switch (sort) {
        case 'rating':
          return [{ rating_avg: 'desc' }, { created_at: 'desc' }];
        case 'price':
          return [{ price: 'asc' }, { created_at: 'desc' }];
        case 'price_desc':
          return [{ price: 'desc' }, { created_at: 'desc' }];
        case 'name':
          return [{ name: 'asc' }];
        case 'distance':
        case 'recency':
        default:
          return [{ is_featured: 'desc' }, { created_at: 'desc' }];
      }
    })();

    const [data, count] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          category: { select: { name: true, slug: true, type: true } },
          owner: { select: { priority_support: true } },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.business.count({ where }),
    ]);

    let serialized = serializeBusinesses(data).map((b) => ({
      ...b,
      priority_support: Boolean(b.owner?.priority_support),
    }));

    const viewerId = req.user?.id || null;
    const activeVendorIds = await getActiveVendorIds();
    if (activeVendorIds !== null) {
      serialized = serialized.filter(b => activeVendorIds.has(b.owner_id) || b.owner_id === viewerId);
    }

    // Priority-support vendors float to the top of the default listing.
    serialized.sort((a, b) => (b.priority_support === true) - (a.priority_support === true));

    const isAdmin = req.user?.role === 'admin';
    serialized = serialized.map(b => stripAdminFields(b, viewerId, isAdmin));

    return res.json({
      success: true,
      data: serialized,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true, type: true } },
        owner: { select: { full_name: true, email: true, phone: true, avatar_url: true, priority_support: true } },
      },
    });
    if (!business) throw new AppError(404, 'NOT_FOUND', 'Business not found.');

    business.service_terms = await getServiceTerms(business.id);
    const reviews = await prisma.review.findMany({
      where: { business_id: id },
      include: { user: { select: { full_name: true, avatar_url: true } } },
      orderBy: { created_at: 'desc' },
    });

    if (business.owner && !req.user) {
      business.owner = { full_name: business.owner.full_name, avatar_url: business.owner.avatar_url };
    }

    const viewerId = req.user?.id || null;
    const isAdmin = req.user?.role === 'admin';
    const safeData = stripAdminFields(serializeBusiness(business), viewerId, isAdmin);

    return res.json({
      success: true,
      data: { ...safeData, priority_support: Boolean(business.owner?.priority_support), reviews },
    });
  } catch (err) {
    next(err);
  }
}

export async function getRelated(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 12);

    const business = await prisma.business.findUnique({
      where: { id },
      include: { category: { select: { type: true } } },
    });
    if (!business) throw new AppError(404, 'NOT_FOUND', 'Business not found.');

    // Candidates: same category, or any category of the same type, that are
    // still available. Rejected listings are never surfaced.
    const candidates = await prisma.business.findMany({
      where: {
        NOT: [
          { id: business.id },
          { verification_status: 'rejected' },
        ],
        availability_status: 'available',
        OR: [
          { category_id: business.category_id },
          { category: { type: business.category?.type } },
        ],
      },
      include: {
        category: { select: { name: true, slug: true, type: true } },
        owner: { select: { priority_support: true } },
      },
    });

    const norm = (v) => (v || '').trim().toLowerCase();
    const price = Number(business.price) || 0;

    const scored = candidates
      .map((c) => {
        let score = 0;
        if (c.category_id === business.category_id) score += 4;
        else if (c.category?.type === business.category?.type) score += 1;
        if (norm(c.city) === norm(business.city) && business.city) score += 2;
        if (norm(c.state) === norm(business.state) && business.state) score += 1;
        if (norm(c.property_type) === norm(business.property_type) && business.property_type) score += 2;
        if (c.listing_type === business.listing_type && business.listing_type) score += 1;
        if (c.condition === business.condition && business.condition) score += 1;
        if (norm(c.vehicle_type) === norm(business.vehicle_type) && business.vehicle_type) score += 1;
        if (c.fuel_type === business.fuel_type && business.fuel_type) score += 1;
        if (price > 0 && Number(c.price) > 0) {
          const diff = Math.abs(Number(c.price) - price) / price;
          if (diff <= 0.3) score += 1;
        }
        return { business: c, score };
      })
      .filter((x) => x.score >= 1)
      .sort((a, b) => b.score - a.score || new Date(b.business.created_at) - new Date(a.business.created_at))
      .slice(0, limit)
      .map((x) => x.business);

    let serialized = serializeBusinesses(scored).map((b) => ({
      ...b,
      priority_support: Boolean(b.owner?.priority_support),
    }));

    const viewerId = req.user?.id || null;
    const isAdmin = req.user?.role === 'admin';
    serialized = serialized.map(b => stripAdminFields(b, viewerId, isAdmin));

    return res.json({ success: true, data: serialized });
  } catch (err) {
    next(err);
  }
}

export async function getResponseTime(req, res, next) {
  try {
    const { id } = req.params;
    const conversations = await prisma.conversation.findMany({
      where: { business_id: id },
      select: { id: true, vendor_id: true },
    });
    if (!conversations || conversations.length === 0) {
      return res.json({ success: true, data: { avgResponseMinutes: null } });
    }
    const convIds = conversations.map((c) => c.id);
    const vendorId = conversations[0].vendor_id;
    const messages = await prisma.message.findMany({
      where: { conversation_id: { in: convIds } },
      select: { conversation_id: true, sender_id: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });
    if (!messages || messages.length === 0) {
      return res.json({ success: true, data: { avgResponseMinutes: null } });
    }
    const groups = {};
    for (const msg of messages) {
      if (!groups[msg.conversation_id]) groups[msg.conversation_id] = [];
      groups[msg.conversation_id].push(msg);
    }
    let totalMinutes = 0;
    let count = 0;
    for (const convId of convIds) {
      const convMessages = groups[convId];
      if (!convMessages || convMessages.length < 2) continue;
      let firstCustomerMsg = null;
      for (const msg of convMessages) {
        if (msg.sender_id !== vendorId) { firstCustomerMsg = msg; break; }
      }
      if (!firstCustomerMsg) continue;
      let firstVendorReply = null;
      const startTime = new Date(firstCustomerMsg.created_at).getTime();
      for (const msg of convMessages) {
        if (msg.sender_id === vendorId) {
          const msgTime = new Date(msg.created_at).getTime();
          if (msgTime > startTime) { firstVendorReply = msg; break; }
        }
      }
      if (!firstVendorReply) continue;
      const diffMs = new Date(firstVendorReply.created_at).getTime() - startTime;
      totalMinutes += diffMs / 60000;
      count++;
    }
    const avgResponseMinutes = count > 0 ? Math.round(totalMinutes / count) : null;
    return res.json({ success: true, data: { avgResponseMinutes } });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { serviceTerms, categoryId, ...rest } = req.body || {};
    const bodyForSchema = categoryId !== undefined ? { ...rest, category_id: categoryId } : rest;
    const parsed = businessCreateSchema.safeParse(bodyForSchema);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      }));
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', issues);
    }
    const data = sanitizeObject(parsed.data, ['name', 'description']);

    const category = await prisma.category.findUnique({ where: { id: data.category_id }, select: { id: true } });
    if (!category) throw new AppError(400, 'INVALID_CATEGORY', 'Category does not exist.');

    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;

    const inserted = await prisma.business.create({
      data: {
        owner_id: req.user.id,
        name: data.name,
        slug,
        category_id: data.category_id,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        email: data.email,
        website: data.website,
        images: stringifyJson(data.images || []),
        certifications: stringifyJson(data.certifications || []),
        is_direct_from_owner: data.is_direct_from_owner ?? (req.user.role === 'property_owner'),
        // Property/listing fields
        listing_type: data.listing_type,
        price: data.price,
        price_type: data.price_type,
        currency: data.currency,
        condition: data.condition,
        property_type: data.property_type,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area_sqm: data.area_sqm,
        year_built: data.year_built,
        furnished: data.furnished,
        vehicle_type: data.vehicle_type,
        fuel_type: data.fuel_type,
        transmission: data.transmission,
        mileage: data.mileage,
        year_of_manufacture: data.year_of_manufacture,
        attributes: data.attributes ? JSON.stringify(data.attributes) : undefined,
        operating_hours: data.operating_hours ? JSON.stringify(data.operating_hours) : undefined,
      },
    });

    if (serviceTerms) await setServiceTerms(inserted.id, serviceTerms);
    return res.status(201).json({ success: true, data: serializeBusiness(inserted) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'admin';
    const existing = await prisma.business.findUnique({ where: { id }, select: { owner_id: true } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business not found.');

    if (!isAdmin && existing.owner_id !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only edit your own business.');
    }

    const attemptedForbidden = Object.keys(req.body || {}).filter((k) => FORBIDDEN_UPDATE_FIELDS.includes(k));
    if (attemptedForbidden.length > 0) {
      throw new AppError(400, 'FORBIDDEN_FIELDS', `Cannot update: ${attemptedForbidden.join(', ')}`, { forbiddenFields: attemptedForbidden });
    }

    const { serviceTerms, ...bodyForUpdate } = req.body || {};
    const safeUpdates = sanitizeObject(pick(bodyForUpdate, BUSINESS_UPDATE_FIELDS), ['name', 'description']);

    // JSON-string columns are stored as strings in SQLite.
    if ('images' in safeUpdates) safeUpdates.images = stringifyJson(safeUpdates.images);
    if ('certifications' in safeUpdates) safeUpdates.certifications = stringifyJson(safeUpdates.certifications);
    if ('attributes' in safeUpdates) safeUpdates.attributes = stringifyJson(safeUpdates.attributes);
    if ('operating_hours' in safeUpdates) safeUpdates.operating_hours = stringifyJson(safeUpdates.operating_hours);

    if (Object.keys(safeUpdates).length === 0 && serviceTerms === undefined) {
      throw new AppError(400, 'NO_UPDATES', 'No updatable fields provided.');
    }

    // Availability management: mark sold/rented records the timestamp,
    // re-listing clears it. Only property/rental/vehicle listings may be
    // marked unavailable.
    if ('availability_status' in safeUpdates) {
      const current = await prisma.business.findUnique({ where: { id }, select: { category_id: true, availability_status: true } });
      const catType = current?.category_id
        ? (await prisma.category.findUnique({ where: { id: current.category_id }, select: { type: true } }))?.type
        : null;
      if (catType === 'service') {
        throw new AppError(400, 'INVALID_AVAILABILITY', 'Availability status only applies to property, rental, or vehicle listings.');
      }
      if (safeUpdates.availability_status === 'available') {
        safeUpdates.sold_at = null;
      } else if (current?.availability_status === 'available') {
        safeUpdates.sold_at = new Date();
      }
    }

    let updatedRow = null;
    if (Object.keys(safeUpdates).length > 0) {
      updatedRow = await prisma.business.update({ where: { id }, data: { ...safeUpdates, updated_at: new Date() } });
    } else {
      updatedRow = await prisma.business.findUnique({ where: { id } });
    }

    if (serviceTerms !== undefined) await setServiceTerms(id, serviceTerms);
    return res.json({ success: true, data: serializeBusiness(updatedRow) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.business.findUnique({ where: { id }, select: { owner_id: true } });
    if (!existing) return res.status(404).json({ success: false, error: 'Business not found' });
    if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    await prisma.business.delete({ where: { id } });
    await deleteBusinessMeta(id).catch(() => {});
    return res.json({ success: true, message: 'Business deleted' });
  } catch (err) {
    next(err);
  }
}
