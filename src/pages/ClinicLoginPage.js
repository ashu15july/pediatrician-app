import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { getSubdomain } from '../utils/getSubdomain';
import { supabase } from '../lib/supabase';

export default function ClinicLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clinicInfo, setClinicInfo] = useState(null);
  const [clinicLoading, setClinicLoading] = useState(true);
  const { login } = useClinicAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClinicInfo = async () => {
      const subdomain = getSubdomain();
      if (subdomain) {
        try {
          setClinicLoading(true);
          // Fetch clinic information from database using RPC function
          const { data: clinicData, error } = await supabase
            .rpc('get_clinic_by_subdomain', { clinic_subdomain: subdomain });

          if (error) {
            console.error('Error fetching clinic:', error);
            setClinicInfo({
              name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Clinic`,
              domain: `https://${subdomain}.myapp.com`,
              credentials: []
            });
          } else if (clinicData && clinicData.length > 0) {
            const clinic = clinicData[0];
            
            // Fetch users for this clinic using RPC function
            const { data: users, error: usersError } = await supabase
              .rpc('get_clinic_users', { clinic_subdomain: subdomain });

            const credentials = users && !usersError ? users.map(user => ({
              role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
              email: user.email,
              password: '***' // We don't show actual passwords for security
            })) : [];

            setClinicInfo({
              name: clinic.name,
              domain: clinic.domain_url,
              credentials
            });
          }
        } catch (error) {
          console.error('Error fetching clinic info:', error);
          setClinicInfo({
            name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Clinic`,
            domain: `https://${subdomain}.myapp.com`,
            credentials: []
          });
        } finally {
          setClinicLoading(false);
        }
      } else {
        setClinicLoading(false);
      }
    };

    fetchClinicInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      // Redirect to clinic dashboard using React Router
      navigate('/clinic-dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (clinicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading clinic information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">
        {clinicInfo && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-200 mb-2">
              {clinicInfo.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {clinicInfo.domain}
            </p>
          </div>
        )}
        
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6 text-center">Clinic Login</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Email</label>
          <input 
            type="email" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
          />
        </div>
        
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2 px-8 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        {clinicInfo && clinicInfo.credentials.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">Available Users</h4>
            <div className="space-y-2">
              {clinicInfo.credentials.map((cred, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{cred.role}:</span>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 ml-2">
                    {cred.email}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Contact your administrator for login credentials
            </p>
          </div>
        )}
      </form>
    </div>
  );
} 