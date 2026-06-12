import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const USER_KEY = 'cardiosense_current_user';
const TOKEN_KEY = 'cardiosense_token';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [user]);

  const register = async ({ name, email, password, role, specialization, licenseNumber }) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, specialization, licenseNumber }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || 'Registration failed.' };
      return { success: true };
    } catch {
      return { success: false, message: 'Unable to register. Check your connection and try again.' };
    }
  };

  const login = async ({ email, password, role }) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || 'Login failed.' };

      setUser(data.user);
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return { success: true };
    } catch {
      return { success: false, message: 'Unable to log in. Check your connection and try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const updateProfile = async (fields) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userId = user?.id || user?._id;
      const response = await fetch(`${API_BASE}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || 'Update failed.' };
      const updated = { ...user, ...data.user };
      setUser(updated);
      return { success: true };
    } catch {
      return { success: false, message: 'Unable to update profile. Check your connection.' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userId = user?.id || user?._id;
      const response = await fetch(`${API_BASE}/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || 'Password change failed.' };
      return { success: true, message: data.message };
    } catch {
      return { success: false, message: 'Unable to change password. Check your connection.' };
    }
  };

  const value = useMemo(() => ({ user, login, logout, register, updateProfile, changePassword }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
