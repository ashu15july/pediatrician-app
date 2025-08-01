import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../contexts/SuperAdminAuthContext';

export default function SuperAdminAuthWrapper({ children }) {
  const { currentUser, loading } = useSuperAdminAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    // Not logged in, redirect to login page using React Router
    navigate('/superadmin-login');
    return null;
  }

  if (currentUser.role !== 'super_admin') {
    // Not authorized
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
        <p className="text-gray-700">You do not have permission to access the Super Admin dashboard.</p>
      </div>
    );
  }

  // Authorized
  return children;
} 