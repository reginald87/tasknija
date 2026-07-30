import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi.js';

vi.mock('../../services/api.js', () => {
  return {
    api: {
      get: vi.fn(),
    },
  };
});

import { api } from '../../services/api.js';

describe('useApi', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches data and updates state', async () => {
    api.get.mockResolvedValueOnce({ items: [1, 2, 3] });
    const { result } = renderHook(() => useApi('/foo'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ items: [1, 2, 3] });
    expect(result.current.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/foo', { params: null });
  });

  it('skips fetch when skip=true', async () => {
    const { result } = renderHook(() => useApi('/foo', { skip: true }));
    expect(result.current.loading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('captures errors', async () => {
    const err = new Error('boom');
    api.get.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useApi('/foo'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.data).toBeNull();
  });

  it('refetch re-runs the request', async () => {
    api.get.mockResolvedValueOnce({ v: 1 });
    api.get.mockResolvedValueOnce({ v: 2 });
    const { result } = renderHook(() => useApi('/foo'));
    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));
    await result.current.refetch();
    expect(result.current.data).toEqual({ v: 2 });
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
