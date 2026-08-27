import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useApplications(filters = {}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const filtersKey = JSON.stringify(filters);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.schemeId && filters.schemeId !== 'all') params.set('scheme_id', filters.schemeId);
      if (filters.districtId && filters.districtId !== 'all') params.set('district_id', filters.districtId);
      if (filters.status && filters.status !== 'all') params.set('application_status', filters.status);
      if (filters.aiAnalysis && filters.aiAnalysis !== 'all') params.set('ai_analysis', filters.aiAnalysis);
      if (filters.concernLevel && filters.concernLevel !== 'all') params.set('concern_level', filters.concernLevel);
      if (filters.appliedDate) params.set('applied_from', filters.appliedDate);
      const response = await api.get(`/api/v1/applications${params.toString() ? `?${params}` : ''}`);
      setData(response.items || response);
      setTotal(response.total ?? response.items?.length ?? response.length);
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

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  return { data, total, loading, error, isFallback, refetch: fetchApplications };
}

export function useApplicationDetail(applicationId) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchApplication = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/applications/${applicationId}`);
      setApplication(response);
      setIsFallback(false);
    } catch (err) {
      setApplication(null);
      setIsFallback(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { fetchApplication(); }, [fetchApplication]);

  const updateStatus = async (status, note) => {
    try {
      const response = await api.put(`/api/v1/applications/${applicationId}/status?new_status=${status}${note ? `&note=${encodeURIComponent(note)}` : ''}`);
      setApplication(response);
      setIsFallback(false);
      return { success: true, application: response };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update application status' };
    }
  };

  const verifyDocument = async (documentId, status, reason = '') => {
    try {
      const response = await api.request(`/api/v1/documents/${documentId}/verify`, { method: 'PATCH', body: JSON.stringify({ status, reason }) });
      setApplication(previous => previous ? { ...previous, documents: (previous.documents || []).map(document => document.id === documentId ? response : document) } : previous);
      return { success: true, document: response };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to verify document' };
    }
  };


  return { application, loading, error, isFallback, refetch: fetchApplication, updateStatus, verifyDocument };
}

export function useApplicationSummary() {
  const [data, setData] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get('/api/v1/applications/summary')); setIsFallback(false); }
    catch { setData(null); setIsFallback(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  return { data, isFallback, loading, refetch };
}

export function useApplicationVerification(applicationId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVerification = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/v1/applications/${applicationId}/verification`);
      setData(res);
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { fetchVerification(); }, [fetchVerification]);
  return { data, loading, error, refetch: fetchVerification };
}
