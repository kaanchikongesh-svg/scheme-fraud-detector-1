import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useBeneficiaries(filters = {}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const filtersKey = JSON.stringify(filters);

  const fetchBeneficiaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.district_id) params.append('district_id', filters.district_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.concern_level && filters.concern_level !== 'all') params.append('concern_level', filters.concern_level);
      params.append('limit', filters.limit || 500);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/api/v1/beneficiaries${qs}`);
      
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
  }, [filtersKey]);

  useEffect(() => {
    fetchBeneficiaries();
  }, [fetchBeneficiaries]);

  return { data, total, loading, error, isFallback, refetch: fetchBeneficiaries };
}

export function useBeneficiaryDetail(id) {
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/v1/beneficiaries/${id}`);
      setBeneficiary(res);
      setIsFallback(false);
    } catch (err) {
      setBeneficiary(null);
      setIsFallback(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const updateStatus = async (newStatus, notes) => {
    try {
      await api.patch(`/api/v1/beneficiaries/${id}/status?new_status=${newStatus}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`);
      await fetchDetail();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update beneficiary status' };
    }
  };

  const reEvaluateAI = async () => {
    try {
      const res = await api.post(`/api/v1/ai/evaluate/${id}`);
      await fetchDetail();
      return res;
    } catch (err) {
      throw err;
    }
  };


  return { beneficiary, loading, error, isFallback, refetch: fetchDetail, updateStatus, reEvaluateAI };
}
