import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { email, token } = location.state || {};

  useEffect(() => {
    if (!email || !token) {
      navigate('/forgot-password');
    }
  }, [email, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Resetting password for email:', email);
      
      // Use the correct API base URL based on current port
      const apiBase = window.location.port === '3001' 
        ? 'http://localhost:3001/api'
        : '/api';
      
      const res = await fetch(`${apiBase}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, token, newPassword: password })
      });
      
      console.log('Response status:', res.status);
      
      const responseData = await res.json();
      console.log('Response data:', responseData);
      
      setLoading(false);
      
      if (res.ok) {
        setSuccess('Password reset successfully!');
        setTimeout(() => {
          navigate('/clinic-login');
        }, 2000);
      } else {
        const errorMessage = responseData.error?.message || responseData.error || 'Failed to reset password. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error in password reset:', err);
      setLoading(false);
      setError('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-200 mb-6 text-center">Reset Password</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">New Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            minLength="6"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Confirm Password</label>
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required 
            minLength="6"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
          />
        </div>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-4">{success}</div>}
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2 px-8 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
} 