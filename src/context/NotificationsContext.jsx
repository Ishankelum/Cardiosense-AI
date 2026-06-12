import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getStoredToken } from './AuthContext';
import { useAuth } from './AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const POLL_MS  = 15000; // poll every 15 seconds

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]               = useState(0);
  const [loading, setLoading]             = useState(false);
  const intervalRef = useRef(null);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getStoredToken()}`,
  });

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res  = await fetch(`${API_BASE}/api/notifications`, { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnread(data.unread || 0);
      }
    } catch { /* silent */ }
  }, [user]);

  // Start polling when user is logged in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      clearInterval(intervalRef.current);
      return;
    }
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [user, fetchNotifications]);

  const markRead = async (id) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PUT', headers: headers() });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      setLoading(true);
      await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PUT', headers: headers() });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const deleteNotification = async (id) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE', headers: headers() });
      const removed = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (removed && !removed.read) setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const clearAll = async () => {
    try {
      setLoading(true);
      await fetch(`${API_BASE}/api/notifications`, { method: 'DELETE', headers: headers() });
      setNotifications([]);
      setUnread(0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <NotificationsContext.Provider value={{
      notifications, unread, loading,
      fetchNotifications, markRead, markAllRead,
      deleteNotification, clearAll,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider');
  return ctx;
};
