import { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { getStoredToken } from './AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const POLL_INTERVAL = 20000; // auto-refresh every 20 seconds
const ReportsContext = createContext(null);

const authHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const ReportsProvider = ({ children }) => {
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchReports = useCallback(async (silent = false) => {
    const token = getStoredToken();
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/reports`, {
        headers: { ...authHeaders() },
      });
      if (!response.ok) return;
      const data = await response.json();
      setReports(data.reports || []);
      setLastUpdated(new Date());
    } catch {
      // silent fail
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 20 s for live sync between cardiologist & patient
  useEffect(() => {
    fetchReports();
    pollRef.current = setInterval(() => fetchReports(true), POLL_INTERVAL);
    // Re-fetch when token appears (after login)
    const onStorage = (e) => { if (e.key === 'cardiosense_token' && e.newValue) fetchReports(); };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(pollRef.current);
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchReports]);

  const uploadReport = useCallback(async (formData) => {
    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Upload failed.');
    setReports((prev) => [data.report, ...prev]);
    return data.report;
  }, []);

  const updateReport = useCallback(async (id, updates) => {
    const response = await fetch(`${API_BASE}/api/reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Update failed.');
    setReports((prev) => prev.map((r) => (r._id === id ? data.report : r)));
    return data.report;
  }, []);

  const getReportsByCardiologist = useCallback(
    (email) => reports.filter((r) => r.cardiologistEmail === email?.toLowerCase()),
    [reports],
  );

  const getReportsByPatient = useCallback(
    (email) => reports.filter((r) => r.patientEmail === email?.toLowerCase()),
    [reports],
  );

  const value = useMemo(
    () => ({ reports, loading, lastUpdated, fetchReports, uploadReport, updateReport, getReportsByCardiologist, getReportsByPatient }),
    [reports, loading, lastUpdated, fetchReports, uploadReport, updateReport, getReportsByCardiologist, getReportsByPatient],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
};

export const useReports = () => {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used within ReportsProvider');
  return ctx;
};
