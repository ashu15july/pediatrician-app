import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import WhatsAppConfigForm from './components/WhatsAppConfigForm';
import { useSuperAdminAuth } from './contexts/SuperAdminAuthContext';

const SuperAdminApp = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    logo: null,
    adminEmail: '',
    phone: '',
    email: '',
    address: '',
    hours: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    role: 'doctor',
    // Doctor-specific fields
    specialization: '',
    experience_years: '',
    education: '',
    consultation_fee: '',
    availability: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '13:00', available: false },
      sunday: { start: '09:00', end: '17:00', available: false }
    }
  });
  const [clinicUsers, setClinicUsers] = useState([]);
  const { logout, currentUser } = useSuperAdminAuth();

  useEffect(() => {
    fetchClinics();
  }, []);

  // Convert file to Base64
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

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

  const handleUserFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested availability object
    if (name.startsWith('availability.')) {
      const [day, field] = name.split('.');
      setUserForm(f => ({
        ...f,
        availability: {
          ...f.availability,
          [day]: {
            ...f.availability[day],
            [field]: field === 'available' ? checked : value
          }
        }
      }));
    } else {
      setUserForm(f => ({ ...f, [name]: value }));
    }
  };

  const loadClinicUsers = async (clinicId) => {
    try {
      console.log('Loading users for clinic:', clinicId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading clinic users:', error);
        setError(`Failed to load clinic users: ${error.message}`);
        setClinicUsers([]);
      } else {
        console.log('Loaded users:', data);
        setClinicUsers(data || []);
        setError(''); // Clear any previous errors
      }
    } catch (err) {
      console.error('Error loading clinic users:', err);
      setError(`Failed to load clinic users: ${err.message}`);
      setClinicUsers([]);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate clinic selection
    if (!selectedClinic) {
      setError('No clinic selected');
      return;
    }

    // Enhanced validation
    if (!userForm.email || userForm.email.trim() === '') {
      setError('Email is required');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userForm.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!userForm.full_name || userForm.full_name.trim() === '') {
      setError('Full name is required');
      return;
    }

    if (!userForm.password || userForm.password.trim() === '') {
      setError('Password is required');
      return;
    }

    // Password strength validation
    if (userForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Phone validation (if provided)
    if (userForm.phone && userForm.phone.trim() !== '') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(userForm.phone.replace(/[\s\-\(\)]/g, ''))) {
        setError('Please enter a valid phone number');
        return;
      }
    }

    // Role validation
    const validRoles = ['doctor', 'admin', 'support', 'super_admin'];
    if (!validRoles.includes(userForm.role)) {
      setError('Invalid role selected');
      return;
    }

    // Doctor-specific validation
    if (userForm.role === 'doctor') {
      if (!userForm.specialization || userForm.specialization.trim() === '') {
        setError('Specialization is required for doctors');
        return;
      }
      if (!userForm.experience_years || userForm.experience_years.trim() === '') {
        setError('Experience years is required for doctors');
        return;
      }
      if (!userForm.consultation_fee || userForm.consultation_fee.trim() === '') {
        setError('Consultation fee is required for doctors');
        return;
      }
      if (isNaN(parseInt(userForm.experience_years)) || parseInt(userForm.experience_years) < 0) {
        setError('Experience years must be a valid positive number');
        return;
      }
      if (isNaN(parseFloat(userForm.consultation_fee)) || parseFloat(userForm.consultation_fee) < 0) {
        setError('Consultation fee must be a valid positive number');
        return;
      }
    }

    setLoading(true);
    try {
      // Prepare education array
      const educationArray = userForm.education ? userForm.education.split(',').map(edu => edu.trim()).filter(edu => edu) : [];

      console.log('Adding user with data:', {
        clinic_id: selectedClinic.id,
        user_email: userForm.email.trim(),
        user_full_name: userForm.full_name.trim(),
        user_password: userForm.password,
        user_role: userForm.role,
        user_phone: userForm.phone ? userForm.phone.trim() : null,
        // Doctor-specific data
        specialization: userForm.role === 'doctor' ? userForm.specialization.trim() : null,
        experience_years: userForm.role === 'doctor' ? parseInt(userForm.experience_years) : null,
        education: userForm.role === 'doctor' ? educationArray : null,
        consultation_fee: userForm.role === 'doctor' ? parseFloat(userForm.consultation_fee) : null,
        availability: userForm.role === 'doctor' ? userForm.availability : null
      });

      const { data, error } = await supabase.rpc('add_clinic_user', {
        clinic_id: selectedClinic.id,
        user_email: userForm.email.trim(),
        user_full_name: userForm.full_name.trim(),
        user_password: userForm.password,
        user_role: userForm.role,
        user_phone: userForm.phone ? userForm.phone.trim() : null,
        // Doctor-specific parameters
        specialization: userForm.role === 'doctor' ? userForm.specialization.trim() : null,
        experience_years: userForm.role === 'doctor' ? parseInt(userForm.experience_years) : null,
        education: userForm.role === 'doctor' ? educationArray : null,
        consultation_fee: userForm.role === 'doctor' ? parseFloat(userForm.consultation_fee) : null,
        availability: userForm.role === 'doctor' ? userForm.availability : null
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Database error occurred');
      }

      if (!data) {
        throw new Error('No response received from server');
      }

      if (data.success === true) {
        setSuccess(`User "${userForm.full_name}" added successfully!`);
        
        // Reset form
        setUserForm({
          email: '',
          full_name: '',
          phone: '',
          password: '',
          role: 'doctor',
          // Reset doctor-specific fields
          specialization: '',
          experience_years: '',
          education: '',
          consultation_fee: '',
          availability: {
            monday: { start: '09:00', end: '17:00', available: true },
            tuesday: { start: '09:00', end: '17:00', available: true },
            wednesday: { start: '09:00', end: '17:00', available: true },
            thursday: { start: '09:00', end: '17:00', available: true },
            friday: { start: '09:00', end: '17:00', available: true },
            saturday: { start: '09:00', end: '13:00', available: false },
            sunday: { start: '09:00', end: '17:00', available: false }
          }
        });
        
        // Reload users list
        await loadClinicUsers(selectedClinic.id);
        
        console.log('User added successfully:', data.user_data);
      } else {
        // Handle specific error messages from the function
        const errorMessage = data.message || 'Failed to add user';
        console.error('Function error:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error in handleAddUser:', err);
      setError(err.message || 'Failed to add user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(form.subdomain)) {
      setError('Subdomain must contain only lowercase letters, numbers, and hyphens.');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Convert logo to Base64 if provided
      let logo_base64 = '';
      if (form.logo) {
        try {
          // Check file size (limit to 2MB for base64)
          if (form.logo.size > 2 * 1024 * 1024) {
            setError('Logo file size must be less than 2MB');
            setLoading(false);
            return;
          }
          
          // Convert file to Base64
          logo_base64 = await convertFileToBase64(form.logo);
        } catch (uploadErr) {
          console.error('Logo conversion failed:', uploadErr);
          setError('Failed to process logo file');
          setLoading(false);
          return;
        }
      }

      // 2. Generate domain URL based on subdomain
      const domain_url = `https://${form.subdomain}.pediacircle.com`;

      // 3. Insert clinic with all required fields
      const { data: clinic, error: insertError } = await supabase.from('clinics').insert([
        {
          name: form.name,
          subdomain: form.subdomain,
          logo_base64: logo_base64 || null,
          domain_url,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          hours: form.hours || null,
          created_at: new Date().toISOString(),
        },
      ]).select().single();
      
      if (insertError) throw insertError;
      
      setSuccess('Clinic onboarded successfully!');
      setForm({ name: '', subdomain: '', logo: null, adminEmail: '', phone: '', email: '', address: '', hours: '' });
      fetchClinics();
    } catch (err) {
      setError(err.message || 'Failed to onboard clinic.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header with logout */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-200">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage all clinics from here</p>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome, {currentUser.email}
                </span>
              )}
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 max-w-xl w-full mb-8">
          <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-200 mb-4 text-center">Onboard New Clinic</h2>
          <p className="text-lg text-gray-700 dark:text-gray-200 mb-8 text-center">
            Add a new clinic to the system.
          </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Clinic Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Subdomain</label>
            <input type="text" name="subdomain" value={form.subdomain} onChange={handleChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            <p className="text-xs text-gray-500 mt-1">e.g., <span className="font-mono">clinicA</span> (will be used as <span className="font-mono">clinicA.pediacircle.com</span>)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Logo (optional)</label>
            <input type="file" name="logo" accept="image/*" onChange={handleChange} className="w-full" />
            <p className="text-xs text-gray-500 mt-1">
              Logo will be stored as Base64 in the database (max 2MB).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Admin Email</label>
            <input type="email" name="adminEmail" value={form.adminEmail} onChange={handleChange} required className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Clinic Phone</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" placeholder="+1 (555) 123-4567" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Clinic Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" placeholder="clinic@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Clinic Address</label>
            <textarea name="address" value={form.address} onChange={handleChange} rows="3" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" placeholder="123 Main St, City, State 12345"></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Operating Hours</label>
            <textarea name="hours" value={form.hours} onChange={handleChange} rows="2" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" placeholder="Monday-Friday: 9:00 AM - 5:00 PM&#10;Saturday: 9:00 AM - 2:00 PM"></textarea>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2 px-8 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60">
            {loading ? 'Onboarding...' : 'Onboard Clinic'}
          </button>
        </form>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
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
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {clinic.phone && <div className="text-xs text-gray-600 dark:text-gray-400">{clinic.phone}</div>}
                          {clinic.email && <div className="text-xs text-gray-600 dark:text-gray-400">{clinic.email}</div>}
                          {!clinic.phone && !clinic.email && <div className="text-xs text-gray-400">No contact info</div>}
                        </div>
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
                        {clinic.logo_base64 ? (
                          <img src={clinic.logo_base64} alt={`${clinic.name} logo`} className="h-8 w-8 rounded-full object-cover" />
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
                            setShowUserManagement(true);
                            loadClinicUsers(clinic.id);
                          }}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                        >
                          Manage Users
                        </button>
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
      </div>

      {/* User Management Modal */}
      {showUserManagement && selectedClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Manage Users for {selectedClinic.name}
                </h2>
                <button
                  onClick={() => {
                    setShowUserManagement(false);
                    setSelectedClinic(null);
                    setClinicUsers([]);
                    setError(''); // Clear error messages
                    setSuccess(''); // Clear success messages
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add User Form */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New User</h3>
                  
                  {/* Error and Success Messages */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{success}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={userForm.email}
                        onChange={handleUserFormChange}
                        required
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="user@clinic.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={userForm.full_name}
                        onChange={handleUserFormChange}
                        required
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={userForm.phone}
                        onChange={handleUserFormChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        required
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="Enter password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                      <select
                        name="role"
                        value={userForm.role}
                        onChange={handleUserFormChange}
                        required
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                        <option value="support">Support</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>

                    {/* Doctor-specific fields - only show when role is doctor */}
                    {userForm.role === 'doctor' && (
                      <>
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Doctor Information</h4>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialization *</label>
                              <input
                                type="text"
                                name="specialization"
                                value={userForm.specialization}
                                onChange={handleUserFormChange}
                                required
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="e.g., Pediatrician, Cardiologist"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience (Years) *</label>
                              <input
                                type="number"
                                name="experience_years"
                                value={userForm.experience_years}
                                onChange={handleUserFormChange}
                                required
                                min="0"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="5"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Education</label>
                              <input
                                type="text"
                                name="education"
                                value={userForm.education}
                                onChange={handleUserFormChange}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="MBBS, MD Pediatrics (comma separated)"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consultation Fee ($) *</label>
                              <input
                                type="number"
                                name="consultation_fee"
                                value={userForm.consultation_fee}
                                onChange={handleUserFormChange}
                                required
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="50.00"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Availability</label>
                              <div className="space-y-2">
                                {Object.entries(userForm.availability).map(([day, schedule]) => (
                                  <div key={day} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      name={`availability.${day}.available`}
                                      checked={schedule.available}
                                      onChange={handleUserFormChange}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize w-20">{day}</span>
                                    {schedule.available && (
                                      <>
                                        <input
                                          type="time"
                                          name={`availability.${day}.start`}
                                          value={schedule.start}
                                          onChange={handleUserFormChange}
                                          className="rounded border-gray-300 text-sm"
                                        />
                                        <span className="text-sm text-gray-500">to</span>
                                        <input
                                          type="time"
                                          name={`availability.${day}.end`}
                                          value={schedule.end}
                                          onChange={handleUserFormChange}
                                          className="rounded border-gray-300 text-sm"
                                        />
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-60"
                    >
                      {loading ? 'Adding User...' : 'Add User'}
                    </button>
                  </form>
                </div>

                {/* Users List */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Current Users</h3>
                  <div className="space-y-3">
                    {clinicUsers.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No users found for this clinic.</p>
                    ) : (
                      clinicUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">{user.full_name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                              {user.phone && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{user.phone}</p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'super_admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              user.role === 'doctor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  // WhatsApp configured successfully
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