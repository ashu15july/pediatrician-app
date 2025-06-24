import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ClinicOnboardingPage() {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    let logo_url = null;
    try {
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${subdomain}-${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage
          .from('clinic-logos')
          .upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from('clinic-logos')
          .getPublicUrl(fileName);
        logo_url = publicUrlData.publicUrl;
      }
      const { error: insertError } = await supabase.from('clinics').insert([
        { name, subdomain, logo_url }
      ]);
      if (insertError) throw insertError;
      setSuccess('Clinic created successfully!');
      setName('');
      setSubdomain('');
      setLogoFile(null);
    } catch (err) {
      setError(err.message || 'Failed to create clinic');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-12 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6 text-blue-700 dark:text-blue-200">Onboard a New Clinic</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Clinic Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Subdomain (e.g., clinicA)</label>
          <input
            type="text"
            value={subdomain}
            onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            pattern="^[a-z0-9-]+$"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
          />
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">This will be used as the URL: <span className="font-mono">[subdomain].yourapp.com</span></p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Logo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setLogoFile(e.target.files[0])}
            className="w-full"
          />
        </div>
        {error && <div className="text-red-600 dark:text-red-400 font-semibold">{error}</div>}
        {success && <div className="text-green-600 dark:text-green-400 font-semibold">{success}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Clinic'}
        </button>
      </form>
    </div>
  );
} 