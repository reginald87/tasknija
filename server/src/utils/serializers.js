// Shared serialization helpers for JSON-string columns stored in SQLite.

export function parseJson(v, fallback = null) {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function stringifyJson(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

// A Business row stores images/certifications/operating_hours/attributes as JSON strings.
// The API has always returned them as native arrays/objects, so parse them on
// read to preserve the response shape clients expect.
export function serializeBusiness(b) {
  if (!b) return b;
  return {
    ...b,
    images: parseJson(b.images, []),
    certifications: parseJson(b.certifications, []),
    operating_hours: parseJson(b.operating_hours, null),
    attributes: parseJson(b.attributes, null),
  };
}

export function serializeBusinesses(list) {
  return (list || []).map(serializeBusiness);
}

// Message.attachments is a JSON string.
export function serializeMessage(m) {
  if (!m) return m;
  return { ...m, attachments: parseJson(m.attachments, null) };
}

export function serializeMessages(list) {
  return (list || []).map(serializeMessage);
}

// Quote.terms may embed milestones JSON; Quote controller handles that itself,
// but ensure `terms` is a string (or null) on output.
export function serializeQuote(q) {
  if (!q) return q;
  return { ...q, terms: q.terms || null };
}
