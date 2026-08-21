import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('verdant_token');
    const saved = localStorage.getItem('verdant_user');
    if (token && saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('verdant_token');
    const u = localStorage.getItem('verdant_user');
    return (t && u) ? t : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleReset = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('verdant_auth_reset', handleReset);
    return () => window.removeEventListener('verdant_auth_reset', handleReset);
  }, []);

  const login = async ({ email, mobile, password }) => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/login', { email, mobile, password });
      setUser(res.user);
      setToken(res.access_token);
      localStorage.setItem('verdant_user', JSON.stringify(res.user));
      localStorage.setItem('verdant_token', res.access_token);
      return { success: true, user: res.user };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/register', data);
      setUser(res.user);
      setToken(res.access_token);
      localStorage.setItem('verdant_user', JSON.stringify(res.user));
      localStorage.setItem('verdant_token', res.access_token);
      return { success: true, user: res.user };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email, mobile) => {
    return await api.post('/api/v1/auth/forgot-password', { email, mobile });
  };

  const resetPassword = async (token, newPassword, confirmPassword) => {
    return await api.post('/api/v1/auth/reset-password', { token, new_password: newPassword, confirm_password: confirmPassword });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('verdant_user');
    localStorage.removeItem('verdant_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
