import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const stored = await authService.getStoredSession();
      if (stored.token) {
        setToken(stored.token);
        setUser(stored.user);

        // Verify with backend
        const verified = await authService.getMe(stored.token);
        if (verified.success) {
          setUser(verified.user);
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (formData) => {
    const res = await authService.register(formData);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
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
