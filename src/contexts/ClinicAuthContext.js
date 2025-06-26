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
      // Set the user email in database session for RLS policies
      setUserEmailInSession(user.email);
    }
    setLoading(false);
  }, []);

  const fetchClinicBySubdomain = async (subdomain) => {
    try {
      const { data: clinicData, error } = await supabase
        .rpc('get_clinic_by_subdomain', { clinic_subdomain: subdomain });

      if (error) {
        console.error('Error fetching clinic:', error);
        return;
      }

      if (clinicData && clinicData.length > 0) {
        const clinic = clinicData[0];
        setCurrentClinic({
          subdomain: clinic.subdomain,
          domain: clinic.domain_url,
          name: clinic.name,
          id: clinic.id
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
      // Optionally, check clinic_id matches current subdomain's clinic
      // (You can add extra checks here if needed)
      localStorage.setItem('clinicUser', JSON.stringify(data.user));
      setCurrentUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Clinic user login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('clinicUser');
    localStorage.removeItem('currentClinicSubdomain');
    setCurrentUser(null);
    // Clear the session email - handle the RPC call properly
    try {
      supabase.rpc('clear_user_email_session').then(() => {
        console.log('User email session cleared');
      }).catch((error) => {
        console.error('Error clearing user email session:', error);
      });
    } catch (error) {
      console.error('Error calling clear_user_email_session:', error);
    }
  };

  const hasPermission = (permission) => {
    const userRole = currentUser?.role;
    return userRoles[userRole]?.permissions.includes(permission) ?? false;
  };

  const value = {
    currentUser,
    currentClinic,
    isLoggedIn: !!currentUser,
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