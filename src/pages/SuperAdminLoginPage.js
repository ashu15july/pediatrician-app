import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../contexts/SuperAdminAuthContext';

export default function SuperAdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      // Redirect to super admin dashboard using React Router
      navigate('/superadmin/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-200 mb-6 text-center">Super Admin Login</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
        </div>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2 px-8 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60">
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-blue-600 underline hover:text-blue-800 text-sm font-medium"
            onClick={() => navigate('/forgot-password')}
          >
            Forgot Password?
          </button>
        </div>
        <div className="mt-4 text-sm text-center text-gray-600">
          <p>Super Admin Credentials:</p>
          <p className="font-mono">admin@pediatrician.com / admin123</p>
        </div>
      </form>
    </div>
  );
} 