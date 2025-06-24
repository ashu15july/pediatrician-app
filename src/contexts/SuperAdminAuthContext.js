import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
      // Query the custom users table for super admin
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', username)
        .eq('role', 'super_admin')
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials or not a super admin');
      }

      // Verify password using PostgreSQL crypt function
      const { data: passwordCheck, error: passwordError } = await supabase
        .rpc('verify_password', {
          input_password: password,
          stored_hash: data.password_hash
        });

      if (passwordError || !passwordCheck) {
        throw new Error('Invalid password');
      }

      // Update last_login timestamp
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      const userData = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        username: data.username,
        is_super_admin: true
      };

      // Store the user in localStorage
      localStorage.setItem('superAdminUser', JSON.stringify(userData));
      setCurrentUser(userData);
      return userData;
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