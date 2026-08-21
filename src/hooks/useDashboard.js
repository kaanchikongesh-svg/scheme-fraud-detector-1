import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useDashboardSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/ai/dashboard-summary');
      setData(res);
      setIsFallback(false);
    } catch (err) {
      setData(null);
      setIsFallback(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isFallback, refetch: fetchData };
}
