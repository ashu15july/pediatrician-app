import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSubdomain } from '../utils/getSubdomain';

// User roles and their permissions
const userRoles = {
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

const ClinicAuthContext = createContext();

export function useClinicAuth() {
  return useContext(ClinicAuthContext);
}

export function ClinicAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentClinic, setCurrentClinic] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get subdomain and determine clinic
    const subdomain = getSubdomain();
    if (subdomain) {
      // Fetch clinic information from database based on subdomain
      fetchClinicBySubdomain(subdomain);
    }

    // Check if there's a stored clinic user in localStorage
    const storedUser = localStorage.getItem('clinicUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      // Set the user email in database session for RLS policies
      setUserEmailInSession(user.email);
    }
    setLoading(false);
  }, []);

  const fetchClinicBySubdomain = async (subdomain) => {
    try {
      const { data: clinicData, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('subdomain', subdomain)
        .single();

      if (error) {
        console.error('Error fetching clinic:', error);
        return;
      }

      if (clinicData) {
        setCurrentClinic({
          subdomain: clinicData.subdomain,
          domain: clinicData.domain_url,
          name: clinicData.name,
          id: clinicData.id
        });
      }
    } catch (error) {
      console.error('Error fetching clinic by subdomain:', error);
    }
  };

  const setUserEmailInSession = async (email) => {
    try {
      // Set the current user email in the database session for RLS policies
      await supabase.rpc('set_user_email_session', { user_email: email });
    } catch (error) {
      console.error('Error setting user email in session:', error);
    }
  };

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
      setCurrentUser(userData.user);
      setIsLoggedIn(true);
      setError(null);
      // Store user in localStorage
      localStorage.setItem('clinicUser', JSON.stringify(userData.user));
      // Set email in session for RLS
      await setUserEmailInSession(userData.user.email);
      return { success: true };
    } catch (err) {
      setError(err.message || 'Login failed');
      setIsLoggedIn(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Get subdomain before clearing localStorage
    const subdomain = currentClinic?.subdomain;
    
    // Clear user state but keep clinic subdomain for redirect
    localStorage.removeItem('clinicUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
    
    // Clear the session email - handle the RPC call properly
    try {
      supabase.rpc('clear_user_email_session').then(() => {
        // Session cleared successfully
      }).catch((error) => {
        console.error('Error clearing user email session:', error);
      });
    } catch (error) {
      console.error('Error calling clear_user_email_session:', error);
    }
    
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
  };

  const hasPermission = (permission) => {
    const userRole = currentUser?.role;
    return userRoles[userRole]?.permissions.includes(permission) ?? false;
  };

  const value = {
    currentUser,
    currentClinic,
    isLoggedIn,
    login,
    logout,
    loading,
    hasPermission
  };

  return (
    <ClinicAuthContext.Provider value={value}>
      {children}
    </ClinicAuthContext.Provider>
  );
} 