import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination.js';

describe('usePagination', () => {
  it('initializes with defaults', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(20);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.offset).toBe(0);
  });

  it('computes totalPages from total/limit', () => {
    const { result } = renderHook(() => usePagination(1, 10));
    act(() => result.current.setTotal(45));
    expect(result.current.totalPages).toBe(5);
    expect(result.current.offset).toBe(0);
    act(() => result.current.setPage(3));
    expect(result.current.offset).toBe(20);
  });

  it('clamps goToPage within range', () => {
    const { result } = renderHook(() => usePagination(1, 10));
    act(() => result.current.setTotal(25));
    act(() => result.current.goToPage(99));
    expect(result.current.page).toBe(3);
    act(() => result.current.goToPage(0));
    expect(result.current.page).toBe(1);
  });

  it('nextPage/prevPage navigate correctly', () => {
    const { result } = renderHook(() => usePagination(1, 10));
    act(() => result.current.setTotal(30));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });
});
