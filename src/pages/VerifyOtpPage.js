import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      
      // Use the correct API base URL based on current port
      const apiBase = window.location.port === '3001' 
        ? 'http://localhost:3001/api'
        : '/api';
      
      const res = await fetch(`${apiBase}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', email, otp })
      });
      
      
      const responseData = await res.json();
      
      setLoading(false);
      
      if (res.ok) {
        setSuccess('OTP verified successfully!');
        setTimeout(() => {
          navigate('/reset-password', { state: { email, token: responseData.token } });
        }, 1000);
      } else {
        const errorMessage = responseData.error?.message || responseData.error || 'Invalid OTP. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      // Error in OTP verification
      setLoading(false);
      setError('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-200 mb-6 text-center">Verify OTP</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
          Enter the OTP sent to {email}
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">OTP</label>
          <input 
            type="text" 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            required 
            maxLength="6"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-center text-lg tracking-widest" 
            placeholder="000000"
          />
        </div>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-4">{success}</div>}
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2 px-8 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>
    </div>
  );
} 