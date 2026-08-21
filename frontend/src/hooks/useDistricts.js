import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useDistricts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchDistricts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/districts');
      setData(res);
      setIsFallback(false);
    } catch (err) {
      setData([]);
      setIsFallback(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  return { data, loading, error, isFallback, refetch: fetchDistricts };
}
