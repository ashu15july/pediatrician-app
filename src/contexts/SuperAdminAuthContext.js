import React, { createContext, useContext, useState, useEffect } from 'react';

const SuperAdminAuthContext = createContext();

export function useSuperAdminAuth() {
  return useContext(SuperAdminAuthContext);
}

export function SuperAdminAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if there's a stored super admin user in localStorage
    const storedUser = localStorage.getItem('superAdminUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: username, password })
      });
      const userData = await res.json();
      if (!res.ok || !userData.success) {
        throw new Error(userData.error || 'Login failed');
      }
      setUser(userData.user);
      setIsLoggedIn(true);
      setError(null);
      return { success: true };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('superAdminUser');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
    login,
    logout,
    loading
  };

  return (
    <SuperAdminAuthContext.Provider value={value}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
} 