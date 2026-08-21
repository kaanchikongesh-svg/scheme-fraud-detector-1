import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useComplaints() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/complaints');
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
    fetchComplaints();
  }, [fetchComplaints]);

  const fileComplaint = async (payload) => {
    try {
      const res = await api.post('/api/v1/complaints', payload);
      await fetchComplaints();
      return { success: true, complaint: res };
    } catch {
      return { success: false, error: 'Failed to file complaint' };
    }
  };

  const updateComplaintStatus = async (id, status, notes = '') => {
    try {
      const res = await api.patch(`/api/v1/complaints/${id}/status`, { status, notes });
      await fetchComplaints();
      return { success: true, complaint: res };
    } catch {
      return { success: false, error: 'Failed to update complaint status' };
    }
  };

  return { data, loading, error, isFallback, refetch: fetchComplaints, fileComplaint, updateComplaintStatus };
}
