import { useState, useCallback, useMemo } from 'react';

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / Math.max(1, limit))),
    [total, limit]
  );

  const setTotalFromResponse = useCallback((responseTotal) => {
    setTotal(responseTotal || 0);
  }, []);

  const goToPage = useCallback(
    (p) => {
      const next = Math.max(1, Math.min(p, totalPages));
      setPage(next);
      return next;
    },
    [totalPages]
  );

  const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage]);
  const prevPage = useCallback(() => goToPage(page - 1), [page, goToPage]);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    total,
    totalPages,
    setPage,
    setLimit,
    setTotal: setTotalFromResponse,
    nextPage,
    prevPage,
    goToPage,
    reset,
    offset: (page - 1) * limit,
  };
}

export default usePagination;
