import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useNetworkGraph(beneficiaryId = 7) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/v1/ai/network-graph/${beneficiaryId}`);
      setData(res);
      setIsFallback(false);
    } catch (err) {
      setData(null);
      setIsFallback(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [beneficiaryId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { data, loading, error, isFallback, refetch: fetchGraph };
}
