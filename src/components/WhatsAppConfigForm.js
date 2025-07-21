import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const WhatsAppConfigForm = ({ clinicId, onSuccess }) => {
  const [form, setForm] = useState({
    whatsappAppId: '',
    whatsappApiKey: '',
    whatsappNumber: '',
    whatsappDisplayName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentConfig, setCurrentConfig] = useState(null);

  useEffect(() => {
    if (clinicId) {
      fetchCurrentConfig();
    }
  }, [clinicId]);

  const fetchCurrentConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('whatsapp_app_id, whatsapp_api_key, whatsapp_number, whatsapp_display_name')
        .eq('id', clinicId)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentConfig(data);
        setForm({
          whatsappAppId: data.whatsapp_app_id || '',
          whatsappApiKey: data.whatsapp_api_key || '',
          whatsappNumber: data.whatsapp_number || '',
          whatsappDisplayName: data.whatsapp_display_name || ''
        });
      }
    } catch (err) {
      console.error('Error fetching current config:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/update-clinic-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          whatsappAppId: form.whatsappAppId,
          whatsappApiKey: form.whatsappApiKey,
          whatsappNumber: form.whatsappNumber,
          whatsappDisplayName: form.whatsappDisplayName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update WhatsApp configuration');
      }

      setSuccess(data.message);
      if (onSuccess) onSuccess(data.clinic);
      
      // Refresh current config
      await fetchCurrentConfig();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!currentConfig?.whatsapp_api_key || !currentConfig?.whatsapp_number) {
      setError('Please configure WhatsApp first before testing');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/send-whatsapp-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: null,
          clinicId,
          patientId: null, // We'll use a test patient
          messageType: 'test_message',
          templateParams: ['Test Patient', 'Test Clinic', 'Test Appointment', 'Test Clinic']
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test message');
      }

      setSuccess('Test message sent successfully! Check your WhatsApp.');

    } catch (err) {
      setError(`Test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        WhatsApp Business API Configuration
      </h3>
      
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">How to get these credentials:</h4>
        <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>1. Sign up at <a href="https://www.gupshup.io" target="_blank" rel="noopener noreferrer" className="underline">Gupshup.io</a></li>
          <li>2. Apply for WhatsApp Business API</li>
          <li>3. Get your credentials from the Gupshup dashboard</li>
          <li>4. Enter them below and save</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            WhatsApp App ID (Optional)
          </label>
          <input
            type="text"
            name="whatsappAppId"
            value={form.whatsappAppId}
            onChange={handleChange}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            placeholder="Your WhatsApp App ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            WhatsApp API Key *
          </label>
          <input
            type="password"
            name="whatsappApiKey"
            value={form.whatsappApiKey}
            onChange={handleChange}
            required
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            placeholder="Your Gupshup API Key"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            WhatsApp Phone Number *
          </label>
          <input
            type="tel"
            name="whatsappNumber"
            value={form.whatsappNumber}
            onChange={handleChange}
            required
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            placeholder="+1234567890 (International format)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Must be in international format with country code
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name (Optional)
          </label>
          <input
            type="text"
            name="whatsappDisplayName"
            value={form.whatsappDisplayName}
            onChange={handleChange}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            placeholder="Your clinic name"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 dark:text-green-400 text-sm font-medium">
            {success}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>

          {currentConfig?.whatsapp_api_key && (
            <button
              type="button"
              onClick={handleTestMessage}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Send Test Message'}
            </button>
          )}
        </div>
      </form>

      {currentConfig && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Current Configuration:</h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>Phone Number:</strong> {currentConfig.whatsapp_number || 'Not set'}</p>
            <p><strong>Display Name:</strong> {currentConfig.whatsapp_display_name || 'Not set'}</p>
            <p><strong>App ID:</strong> {currentConfig.whatsapp_app_id || 'Not set'}</p>
            <p><strong>API Key:</strong> {currentConfig.whatsapp_api_key ? '***' + currentConfig.whatsapp_api_key.slice(-4) : 'Not set'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConfigForm; 