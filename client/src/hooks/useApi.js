import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api.js';

/**
 * Generic data-fetching hook.
 * const { data, loading, error, refetch, setData } = useApi('/foo');
 * const { data, loading, error } = useApi('/foo', { skip: !id, params: { x: 1 } });
 */
export function useApi(url, options = {}) {
  const { skip = false, params = null } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  // Track the latest request so out-of-order responses don't overwrite newer state.
  const reqIdRef = useRef(0);

  const paramsKey = params ? JSON.stringify(params) : '';

  const refetch = useCallback(async () => {
    if (!url || skip) return null;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(url, { params });
      if (reqId === reqIdRef.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (reqId === reqIdRef.current) {
        setError(err);
      }
      throw err;
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, [url, paramsKey, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }
    refetch().catch(() => {
      // error is already captured in state via refetch
    });
  }, [refetch, skip]);

  return { data, loading, error, refetch, setData };
}

export default useApi;
