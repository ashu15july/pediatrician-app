import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there's a stored user in localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      console.log('Starting login process for username:', username);
      
      // Find user in our mock users array
      const user = users.find(u => u.username === username && u.password === password);
      
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Create a user object with the necessary information
      const userData = {
        id: user.id, // Use the predefined UUID
        username: user.username,
        role: user.role,
        user_metadata: { role: user.role }
      };

      // Store the user in localStorage
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      console.log('Login successful:', userData);
      setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        name: error.name
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error details:', error);
      throw error;
    }
  };

  const hasPermission = (permission) => {
    const userRole = currentUser?.role;
    return userRoles[userRole]?.permissions.includes(permission) ?? false;
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
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