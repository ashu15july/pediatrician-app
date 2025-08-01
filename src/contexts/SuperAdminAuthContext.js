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
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (err) {
        // Invalid stored data, clear it
        localStorage.removeItem('superAdminUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
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
      
      // Check if user has super_admin role
      if (userData.user.role !== 'super_admin') {
        throw new Error('Access denied. You do not have super admin privileges.');
      }
      
      // Store user data in localStorage
      localStorage.setItem('superAdminUser', JSON.stringify(userData.user));
      
      setCurrentUser(userData.user);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Invalid username or password';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear user data
    localStorage.removeItem('superAdminUser');
    setCurrentUser(null);
    
    // Super admin should redirect to the main domain (not a specific clinic)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // For production, redirect to main domain
      const mainDomain = window.location.hostname.replace(/^[^.]+\./, '');
      const redirectUrl = `https://${mainDomain}`;
      setTimeout(() => {
        window.location.replace(redirectUrl);
      }, 100);
    } else {
      // For local development, redirect to root
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    }
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