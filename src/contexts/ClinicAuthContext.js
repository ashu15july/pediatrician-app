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
      // Get the current clinic domain
      const subdomain = getSubdomain();
      console.log('ClinicAuthContext: Subdomain:', subdomain);
      
      if (!subdomain) {
        throw new Error('No clinic subdomain found');
      }

      // First, get the clinic ID based on the subdomain using RPC function
      const { data: clinicData, error: clinicError } = await supabase
        .rpc('get_clinic_by_subdomain', { clinic_subdomain: subdomain });

      console.log('ClinicAuthContext: Clinic lookup result:', { clinicData, clinicError });

      if (clinicError || !clinicData || clinicData.length === 0) {
        throw new Error('Clinic not found');
      }

      const clinic = clinicData[0];

      // Query the custom users table for clinic user with matching clinic_id
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', username)
        .eq('clinic_id', clinic.id)
        .neq('role', 'super_admin');

      console.log('ClinicAuthContext: User lookup result:', { users, error });

      if (error || !users || users.length === 0) {
        throw new Error('Invalid credentials or user not found in this clinic');
      }

      // Get the first user (should be only one since email + clinic_id should be unique)
      const data = users[0];

      // Verify password using PostgreSQL crypt function
      const { data: passwordCheck, error: passwordError } = await supabase
        .rpc('verify_password', {
          input_password: password,
          stored_hash: data.password_hash
        });

      console.log('ClinicAuthContext: Password check result:', { passwordCheck, passwordError });

      if (passwordError || !passwordCheck) {
        throw new Error('Invalid password');
      }

      // Update last_login timestamp
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      // Set user email in session for RLS policies
      await setUserEmailInSession(data.email);

      const userData = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        username: data.username,
        clinic_id: data.clinic_id,
        clinic_name: clinic.name,
        clinic_domain: clinic.domain_url,
        is_clinic_user: true
      };

      // Store the user in localStorage
      localStorage.setItem('clinicUser', JSON.stringify(userData));
      setCurrentUser(userData);
      return userData;
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