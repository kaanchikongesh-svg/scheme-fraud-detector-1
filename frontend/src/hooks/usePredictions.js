import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function usePredictions(concernLevel = 'all') {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = concernLevel && concernLevel !== 'all' ? `?concern_level=${concernLevel}` : '';
      const res = await api.get(`/api/v1/ai/predictions${q}`);
      setData(res.items || res);
      setTotal(res.total || (res.items ? res.items.length : res.length));
      setIsFallback(false);
    } catch (err) {
      setData([]);
      setTotal(0);
      setIsFallback(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [concernLevel]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return { data, total, loading, error, isFallback, refetch: fetchPredictions };
}
