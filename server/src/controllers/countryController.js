import { prisma } from '../config/prisma.js';
import { sanitizeError } from '../middleware/errorHandler.js';

export async function getAll(req, res, next) {
  try {
    const data = await prisma.country.findMany({
      select: { id: true, name: true, slug: true, code: true, created_at: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, error: 'Name and code are required' });
    if (name.length > 100) return res.status(400).json({ success: false, error: 'Country name too long' });
    if (code.length > 5) return res.status(400).json({ success: false, error: 'Country code too long' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const data = await prisma.country.create({
      data: { name, slug, code: code.toUpperCase() },
    });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const updates = {};
    if (name) {
      updates.name = name;
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (code) updates.code = code.toUpperCase();
    const data = await prisma.country.update({ where: { id }, data: updates });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.country.delete({ where: { id } });
    return res.json({ success: true, message: 'Country deleted' });
  } catch (err) { next(err); }
}
