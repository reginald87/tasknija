import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use a known API base
vi.stubEnv('VITE_API_URL', 'http://api.test/api');

import { api } from '../api.js';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends JSON body with auth header', async () => {
    localStorage.setItem('accessToken', 'TOKEN123');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { ok: true } }),
      text: async () => '',
    });
    const res = await api.post('/foo', { a: 1 });
    expect(res).toEqual({ ok: true });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('http://api.test/api/foo');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Authorization']).toBe('Bearer TOKEN123');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('returns unwrapped data when envelope present', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: { x: 1 } }),
      text: async () => '',
    });
    const res = await api.get('/foo');
    expect(res).toEqual({ x: 1 });
  });

  it('throws normalized error on non-2xx', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { code: 'E_BAD', message: 'Bad input', details: { field: 'a' } } }),
      text: async () => '',
    });
    await expect(api.post('/foo', {})).rejects.toMatchObject({
      status: 422,
      code: 'E_BAD',
      message: 'Bad input',
      details: { field: 'a' },
    });
  });

  it('builds query string from params on GET', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: [] }),
      text: async () => '',
    });
    await api.get('/foo', { params: { a: 1, b: ['x', 'y'], c: undefined } });
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('a=1');
    expect(url).toContain('b=x');
    expect(url).toContain('b=y');
    expect(url).not.toContain('c=');
  });

  it('refreshes token once on 401 then retries', async () => {
    localStorage.setItem('refreshToken', 'REFRESH');
    // 1st call: 401
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'expired' } }),
      text: async () => '',
    });
    // 2nd call: refresh succeeds
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ accessToken: 'NEW', refreshToken: 'NEWREF' }),
      text: async () => '',
    });
    // 3rd call: retry succeeds
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { ok: true } }),
      text: async () => '',
    });

    const res = await api.get('/foo');
    expect(res).toEqual({ ok: true });
    expect(localStorage.getItem('accessToken')).toBe('NEW');
    expect(localStorage.getItem('refreshToken')).toBe('NEWREF');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    // Retry must include new bearer
    const retryInit = global.fetch.mock.calls[2][1];
    expect(retryInit.headers['Authorization']).toBe('Bearer NEW');
  });

  it('clears tokens when refresh fails', async () => {
    localStorage.setItem('refreshToken', 'REFRESH');
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'expired' } }),
      text: async () => '',
    });
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'bad refresh' } }),
      text: async () => '',
    });

    await expect(api.get('/foo')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('upload uses FormData without JSON Content-Type', async () => {
    localStorage.setItem('accessToken', 'TOK');
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'x.txt');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { url: 'http://x/y' } }),
      text: async () => '',
    });
    const res = await api.upload('/upload', fd);
    expect(res).toEqual({ url: 'http://x/y' });
    const init = global.fetch.mock.calls[0][1];
    expect(init.headers['Authorization']).toBe('Bearer TOK');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBe(fd);
  });
});
