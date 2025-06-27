import React, { createContext, useContext, useState, useEffect } from 'react';

const SuperAdminAuthContext = createContext();

export function useSuperAdminAuth() {
  return useContext(SuperAdminAuthContext);
}

export function SuperAdminAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    try {
      // Call the new login API
      const apiBase = window.location.port === '3001' ? 'http://localhost:3001/api' : '/api';
      const res = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }
      if (data.user.role !== 'super_admin') {
        throw new Error('Not a super admin');
      }
      localStorage.setItem('superAdminUser', JSON.stringify(data.user));
      setCurrentUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Super admin login error:', error);
      throw error;
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