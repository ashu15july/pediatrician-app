import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('Testing connection...');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    envVars: {
      url: process.env.REACT_APP_SUPABASE_URL ? 'Present' : 'Missing',
      key: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
    },
    supabaseConfig: null,
    tables: []
  });

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus('Testing connection...');
      setError(null);

      // Log environment variables (without exposing the actual key)
      console.log('Environment check:', {
        hasUrl: !!process.env.REACT_APP_SUPABASE_URL,
        hasKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
        urlLength: process.env.REACT_APP_SUPABASE_URL?.length,
        keyLength: process.env.REACT_APP_SUPABASE_ANON_KEY?.length
      });

      // Test 1: Basic connection and configuration
      const supabaseConfig = {
        url: supabase.supabaseUrl,
        hasAuth: !!supabase.auth,
        hasStorage: !!supabase.storage,
        hasRealtime: !!supabase.realtime
      };

      setDebugInfo(prev => ({
        ...prev,
        supabaseConfig
      }));

      // Test 2: Database access
      const { data: tablesData, error: tablesError } = await supabase
        .from('patients')
        .select('count')
        .limit(1);

      if (tablesError) {
        if (tablesError.code === '42P01') {
          setError('Table "patients" does not exist. Please check your database setup.');
        } else {
          throw tablesError;
        }
      }

      setConnectionStatus('Connected successfully!');
      
    } catch (err) {
      console.error('Connection test error:', err);
      setConnectionStatus('Connection failed');
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Supabase Connection Test</h2>
      
      <div className="mb-6">
        <div className={`p-4 rounded-lg ${
          error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <h3 className="font-semibold mb-2">Connection Status</h3>
          <p className={error ? 'text-red-600' : 'text-green-600'}>
            {connectionStatus}
          </p>
          {error && (
            <div className="mt-2">
              <p className="text-red-600 text-sm">{error}</p>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">Environment Variables:</h4>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-24">URL:</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        debugInfo.envVars.url === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {debugInfo.envVars.url}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-24">Key:</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        debugInfo.envVars.key === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {debugInfo.envVars.key}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">Troubleshooting Steps:</h4>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-gray-600">
                    <li>Check if your .env file exists in the project root</li>
                    <li>Verify the environment variable names are correct:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>REACT_APP_SUPABASE_URL</li>
                        <li>REACT_APP_SUPABASE_ANON_KEY</li>
                      </ul>
                    </li>
                    <li>Make sure you've restarted your development server after adding the .env file</li>
                    <li>Verify your Supabase project is running and accessible</li>
                    <li>Check if you have the correct permissions set up in Supabase</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {debugInfo.supabaseConfig && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Supabase Configuration</h3>
          <div className="bg-white p-4 rounded-lg border space-y-2">
            <div className="flex justify-between">
              <span>URL Configured:</span>
              <span className={debugInfo.supabaseConfig.url ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.supabaseConfig.url ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Auth Module:</span>
              <span className={debugInfo.supabaseConfig.hasAuth ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.supabaseConfig.hasAuth ? 'Available' : 'Not Available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Storage Module:</span>
              <span className={debugInfo.supabaseConfig.hasStorage ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.supabaseConfig.hasStorage ? 'Available' : 'Not Available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Realtime Module:</span>
              <span className={debugInfo.supabaseConfig.hasRealtime ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.supabaseConfig.hasRealtime ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={testConnection}
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Test Connection Again
      </button>
    </div>
  );
};

export default SupabaseTest; 