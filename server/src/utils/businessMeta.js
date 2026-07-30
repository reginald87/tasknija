import { prisma } from '../config/prisma.js';

// Service terms are stored directly on `businesses.service_terms` (TEXT column).

export async function getServiceTerms(businessId) {
  if (!businessId) return '';
  try {
    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: { service_terms: true },
    });
    return biz?.service_terms || '';
  } catch {
    return '';
  }
}

export async function setServiceTerms(businessId, terms, _userId = null) {
  if (!businessId) throw new Error('businessId is required.');
  await prisma.business.update({
    where: { id: businessId },
    data: { service_terms: terms ?? '', updated_at: new Date() },
  });
}

export async function deleteBusinessMeta(businessId) {
  if (!businessId) return;
  try {
    await prisma.business.update({
      where: { id: businessId },
      data: { service_terms: null, updated_at: new Date() },
    });
  } catch {
    // ignore
  }
}
