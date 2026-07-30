// Tests for uploadController.uploadFile — magic-byte verification (plan: magic-byte-check).
// Verifies that the controller rejects MIME spoofing by checking actual file format
// from the buffer bytes against the client-claimed Content-Type.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const fileUpload = {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: 'fake-id',
      user_id: 'user-1',
      original_name: 'test.jpg',
      stored_name: 'fake-uuid.jpg',
      mime: 'image/jpeg',
      size: 100,
      uploaded_at: '2026-07-03T00:00:00Z',
    }),
    delete: vi.fn().mockResolvedValue({}),
  };
  const prisma = { fileUpload };
  return { prisma };
});

vi.mock('../src/config/prisma.js', () => ({ prisma }));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import { fileTypeFromBuffer } from 'file-type';
import { uploadFile } from '../src/controllers/uploadController.js';

// Real magic-byte sequences for the formats we test against.
const jpegBuffer = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
]);
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
]);
const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A]);
const htmlBuffer = Buffer.from([0x3C, 0x68, 0x74, 0x6D, 0x6C, 0x3E]);
const emptyBuffer = Buffer.alloc(0);

function buildReq(buffer, mimetype = 'image/jpeg', size = 100) {
  return {
    user: { id: 'user-1' },
    files: [
      {
        buffer,
        mimetype,
        size,
        originalname: 'test.jpg',
      },
    ],
  };
}

function buildRes() {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
}

describe('uploadController.uploadFile — magic-byte verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. accepts JPEG bytes with image/jpeg claim', async () => {
    fileTypeFromBuffer.mockResolvedValueOnce({ mime: 'image/jpeg', ext: 'jpg' });
    prisma.fileUpload.create.mockResolvedValueOnce({
      id: 'fake-id',
      user_id: 'user-1',
      original_name: 'test.jpg',
      stored_name: 'fake-uuid.jpg',
      mime: 'image/jpeg',
      size: 100,
      uploaded_at: '2026-07-03T00:00:00Z',
    });

    const req = buildReq(jpegBuffer, 'image/jpeg', 100);
    const res = buildRes();
    const next = vi.fn();

    await uploadFile(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data[0].mime).toBe('image/jpeg');
  });

  it('2. rejects PNG bytes with image/jpeg claim (MIME_MISMATCH)', async () => {
    fileTypeFromBuffer.mockResolvedValueOnce({ mime: 'image/png', ext: 'png' });

    const req = buildReq(pngBuffer, 'image/jpeg', 100);
    const res = buildRes();
    const next = vi.fn();

    await uploadFile(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('MIME_MISMATCH');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('3. rejects HTML bytes with image/jpeg claim (MIME_MISMATCH)', async () => {
    // file-type would normally detect HTML and return text/html, which is not in
    // the whitelist — controller throws on the first check.
    fileTypeFromBuffer.mockResolvedValueOnce({ mime: 'text/html', ext: 'html' });

    const req = buildReq(htmlBuffer, 'image/jpeg', 100);
    const res = buildRes();
    const next = vi.fn();

    await uploadFile(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('MIME_MISMATCH');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('4. accepts PDF bytes with application/pdf claim', async () => {
    fileTypeFromBuffer.mockResolvedValueOnce({ mime: 'application/pdf', ext: 'pdf' });
    prisma.fileUpload.create.mockResolvedValueOnce({
      id: 'fake-pdf-id',
      user_id: 'user-1',
      original_name: 'test.pdf',
      stored_name: 'fake-uuid.pdf',
      mime: 'application/pdf',
      size: 100,
      uploaded_at: '2026-07-03T00:00:00Z',
    });

    const req = buildReq(pdfBuffer, 'application/pdf', 100);
    req.files[0].originalname = 'test.pdf';
    const res = buildRes();
    const next = vi.fn();

    await uploadFile(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
  });

  it('5. rejects empty buffer with image/jpeg claim (MIME_MISMATCH)', async () => {
    // file-type returns undefined when it cannot detect a format from empty bytes.
    fileTypeFromBuffer.mockResolvedValueOnce(undefined);

    const req = buildReq(emptyBuffer, 'image/jpeg', 0);
    const res = buildRes();
    const next = vi.fn();

    await uploadFile(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('MIME_MISMATCH');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('6. rejects PDF bytes with image/jpeg claim (MIME_MISMATCH)', async () => {
    fileTypeFromBuffer.mockResolvedValueOnce({ mime: 'application/pdf', ext: 'pdf' });

    const req = buildReq(pdfBuffer, 'image/jpeg', 100);
    const res = buildRes();
    const next = vi.fn();

    await uploadFile(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('MIME_MISMATCH');
    expect(res.status).not.toHaveBeenCalled();
  });
});
