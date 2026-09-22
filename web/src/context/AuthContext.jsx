import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:5000/api/v1/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('edubridge_token') || '');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Set default axios header
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Restore Session
  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.success) {
          setUser(response.data.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session restoration failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, [token]);

  // Login
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { email, password });
      const { token: newToken, user: userData } = response.data.data;

      localStorage.setItem('edubridge_token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  // Register (Student & Parent)
  const register = async (formData) => {
    setAuthError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, formData);
      const { token: newToken, user: userData } = response.data.data;

      localStorage.setItem('edubridge_token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('edubridge_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        login,
        register,
        logout,
        isAuthenticated: !!user
      }}
    >
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
