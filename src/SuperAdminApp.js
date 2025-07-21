import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import WhatsAppConfigForm from './components/WhatsAppConfigForm';

const SuperAdminApp = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    logo: null,
    adminEmail: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);

  useEffect(() => {
    fetchClinics();
  }, []);

  async function fetchClinics() {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .rpc('get_all_clinics');
      
      if (error) {
        setError(`Failed to load clinics: ${error.message}`);
      } else {
        setClinics(data || []);
        setError('');
      }
    } catch (err) {
      setError(`Failed to load clinics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'logo') {
      setForm(f => ({ ...f, logo: files[0] }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // 1. Upload logo if provided
      let logo_url = '';
      if (form.logo) {
        const fileExt = form.logo.name.split('.').pop();
        const fileName = `${form.subdomain}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('clinic-logos').upload(fileName, form.logo);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('clinic-logos').getPublicUrl(fileName);
        logo_url = publicUrlData.publicUrl;
      }

      // 2. Generate domain URL based on subdomain
      const domain_url = `https://${form.subdomain}.myapp.com`;

      // 3. Insert clinic with all required fields
      const { data: clinic, error: insertError } = await supabase.from('clinics').insert([
        {
          name: form.name,
          subdomain: form.subdomain,
          logo_url,
          domain_url,
          created_at: new Date().toISOString(),
        },
      ]).select().single();
      
      if (insertError) throw insertError;
      
      setSuccess('Clinic onboarded successfully!');
      setForm({ name: '', subdomain: '', logo: null, adminEmail: '' });
      fetchClinics();
    } catch (err) {
      setError(err.message || 'Failed to onboard clinic.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 py-10">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 max-w-xl w-full mt-10 mb-8">
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-200 mb-4 text-center">Super Admin Dashboard</h1>
        <p className="text-lg text-gray-700 dark:text-gray-200 mb-8 text-center">
          Onboard new clinics and manage all clinics from here.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Clinic Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Subdomain</label>
            <input type="text" name="subdomain" value={form.subdomain} onChange={handleChange} required pattern="^[a-z0-9-]+$" title="Lowercase letters, numbers, and hyphens only" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            <p className="text-xs text-gray-500 mt-1">e.g., <span className="font-mono">clinicA</span> (will be used as <span className="font-mono">clinicA.myapp.com</span>)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Logo (optional)</label>
            <input type="file" name="logo" accept="image/*" onChange={handleChange} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Admin Email</label>
            <input type="email" name="adminEmail" value={form.adminEmail} onChange={handleChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2 px-8 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60">
            {loading ? 'Onboarding...' : 'Onboard Clinic'}
          </button>
        </form>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-4xl w-full">
        <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-200 mb-4">All Clinics</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subdomain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {clinics.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No clinics found. Create your first clinic above.
                    </td>
                  </tr>
                ) : (
                  clinics.map(clinic => (
                    <tr key={clinic.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{clinic.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={clinic.domain_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          {clinic.domain_url}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {clinic.subdomain}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {clinic.logo_url ? (
                          <img src={clinic.logo_url} alt={`${clinic.name} logo`} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(clinic.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => {
                            setSelectedClinic(clinic);
                            setShowWhatsAppConfig(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                        >
                          Configure WhatsApp
                        </button>
                        <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" disabled>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Configuration Modal */}
      {showWhatsAppConfig && selectedClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Configure WhatsApp for {selectedClinic.name}
                </h2>
                <button
                  onClick={() => {
                    setShowWhatsAppConfig(false);
                    setSelectedClinic(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <WhatsAppConfigForm 
                clinicId={selectedClinic.id}
                onSuccess={(clinic) => {
                  console.log('WhatsApp configured successfully for:', clinic.name);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminApp; 