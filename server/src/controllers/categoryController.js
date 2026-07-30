import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getAll(req, res, next) {
  try {
    const data = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { businesses: true } } },
    });

    const serialized = data.map((c) => ({
      ...c,
      businesses: { count: c._count.businesses },
    }));

    return res.json({ success: true, data: serialized });
  } catch (err) {
    next(err);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) return next(new AppError(404, 'NOT_FOUND', 'Category not found'));

    // Parse JSON fields
    const parsedCat = {
      ...category,
      filter_config: category.filter_config ? JSON.parse(category.filter_config) : null,
    };

    const businesses = await prisma.business.findMany({
      where: { category_id: category.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        city: true,
        state: true,
        images: true,
        is_featured: true,
        is_recommended: true,
        rating_avg: true,
        rating_count: true,
        created_at: true,
        price: true,
        price_type: true,
        condition: true,
        listing_type: true,
        property_type: true,
        bedrooms: true,
        bathrooms: true,
        furnished: true,
        vehicle_type: true,
        fuel_type: true,
        transmission: true,
        mileage: true,
        year_of_manufacture: true,
        category: { select: { name: true, slug: true, type: true, filter_config: true } },
      },
    });

    return res.json({ success: true, data: { ...parsedCat, businesses } });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, description, type, filter_config } = req.body;
    if (!name) return next(new AppError(400, 'VALIDATION', 'Category name is required'));
    if (name.length > 100) return next(new AppError(400, 'VALIDATION', 'Category name too long'));
    if (description && description.length > 500) return next(new AppError(400, 'VALIDATION', 'Description too long'));
    if (type && !['service', 'property', 'rental'].includes(type)) {
      return next(new AppError(400, 'VALIDATION', 'Type must be service, property, or rental'));
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const data = await prisma.category.create({
      data: {
        name, slug, description,
        type: type || 'service',
        filter_config: filter_config ? JSON.stringify(filter_config) : undefined,
      },
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, type, filter_config } = req.body;
    if (name && name.length > 100) return next(new AppError(400, 'VALIDATION', 'Category name too long'));
    if (description && description.length > 500) return next(new AppError(400, 'VALIDATION', 'Description too long'));
    if (type && !['service', 'property', 'rental'].includes(type)) {
      return next(new AppError(400, 'VALIDATION', 'Type must be service, property, or rental'));
    }
    const updates = {};
    if (name) {
      updates.name = name;
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description) updates.description = description;
    if (type) updates.type = type;
    if (filter_config !== undefined) updates.filter_config = JSON.stringify(filter_config);

    const data = await prisma.category.update({ where: { id }, data: updates });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.business.findFirst({
      where: { category_id: id },
      select: { id: true },
    });

    if (existing) {
      return next(new AppError(400, 'HAS_BUSINESSES', 'Cannot delete category with active businesses. Reassign them first.'));
    }

    await prisma.category.delete({ where: { id } });

    return res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}
