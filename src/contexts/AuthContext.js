import React, { createContext, useContext, useState, useEffect } from 'react';

// User roles and their permissions
export const userRoles = {
  admin: {
    name: 'Admin',
    permissions: ['manage_appointments', 'view_appointments', 'manage_patients', 'view_patients', 'manage_users']
  },
  doctor: {
    name: 'Doctor',
    permissions: ['view_appointments', 'view_patients', 'manage_patients']
  },
  support: {
    name: 'Support',
    permissions: ['manage_appointments', 'view_appointments', 'view_patients', 'manage_patients']
  }
};

// Mock users data for username-based authentication
const users = [
  { 
    id: '047823a8-1341-4dc9-a7e1-8faeef47c1fc', // Dr. Smith's user ID
    username: 'dr.smith', 
    password: 'doctor123', 
    role: 'doctor',
    email: 'dr.smith@pediatrician.com'
  },
  { 
    id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', // Dr. Johnson's user ID
    username: 'dr.johnson', 
    password: 'doctor123', 
    role: 'doctor',
    email: 'dr.johnson@pediatrician.com'
  },
  { 
    id: '743a9ad6-b6ca-44a5-ad4a-f7d77e1a241f', // Admin's user ID
    username: 'admin', 
    password: 'admin123', 
    role: 'admin',
    email: 'admin@pediatrician.com'
  },
  { 
    id: '8b46c485-c414-4780-a707-02dcff7ab2ef', // Support's user ID
    username: 'support', 
    password: 'support123', 
    role: 'support',
    email: 'support@pediatrician.com'
  }
];

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there's a stored user in localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
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

  const logout = async () => {
    try {
      // Get clinic subdomain from multiple sources
      const subdomain = localStorage.getItem('currentClinicSubdomain') || 
                       (() => {
                         const hostname = window.location.hostname;
                         if (hostname === 'localhost' || hostname === '127.0.0.1') {
                           const urlParams = new URLSearchParams(window.location.search);
                           return urlParams.get('clinic');
                         }
                         const parts = hostname.split('.');
                         return parts.length > 2 && parts[0] !== 'www' ? parts[0] : null;
                       })() ||
                       // Try to get from current URL if we're on a subdomain
                       (() => {
                         const hostname = window.location.hostname;
                         if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                           const parts = hostname.split('.');
                           if (parts.length > 2 && parts[0] !== 'www') {
                             return parts[0];
                           }
                         }
                         return null;
                       })();
      
      // Clear user data
      localStorage.removeItem('currentUser');
      setUser(null);
      setIsLoggedIn(false);
      
      // Redirect to clinic page
      if (subdomain) {
        // For production, redirect to subdomain
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          const redirectUrl = `https://${subdomain}.${window.location.hostname.replace(/^[^.]+\./, '')}`;
          setTimeout(() => {
            window.location.replace(redirectUrl);
          }, 100);
        } else {
          // For local development, redirect to root with clinic parameter
          const redirectUrl = `/?clinic=${subdomain}`;
          setTimeout(() => {
            window.location.replace(redirectUrl);
          }, 100);
        }
      } else {
        // Fallback to root
        setTimeout(() => {
          window.location.replace('/');
        }, 100);
      }
    } catch (error) {
      console.error('Logout error details:', error);
      throw error;
    }
  };

  const hasPermission = (permission) => {
    const userRole = user?.role;
    return userRoles[userRole]?.permissions.includes(permission) ?? false;
  };

  const value = {
    user,
    isLoggedIn,
    login,
    logout,
    loading,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 