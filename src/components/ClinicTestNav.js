import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ClinicTestNav() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_all_clinics');

        if (error) {
          console.error('Error fetching clinics:', error);
          // Fallback to hardcoded clinics if database fails
          setClinics([
            { name: 'Happy Kids Clinic', subdomain: 'happykids' },
            { name: 'Sunshine Pediatrics', subdomain: 'sunshine' },
            { name: 'Rainbow Children', subdomain: 'rainbow' }
          ]);
        } else {
          setClinics(data || []);
        }
      } catch (error) {
        console.error('Error fetching clinics:', error);
        // Fallback to hardcoded clinics if database fails
        setClinics([
          { name: 'Happy Kids Clinic', subdomain: 'happykids' },
          { name: 'Sunshine Pediatrics', subdomain: 'sunshine' },
          { name: 'Rainbow Children', subdomain: 'rainbow' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  const handleClinicSelect = (subdomain) => {
    // Navigate to the clinic login with subdomain parameter
    navigate(`/?clinic=${subdomain}`);
  };

  const handleSuperAdminSelect = () => {
    // Clear stored subdomain when switching to super admin
    localStorage.removeItem('currentClinicSubdomain');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Loading clinics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
      <h3 className="font-semibold text-gray-800 mb-3">Test Clinics</h3>
      <div className="space-y-2">
        {clinics.map((clinic) => (
          <button
            key={clinic.subdomain}
            onClick={() => handleClinicSelect(clinic.subdomain)}
            className="block w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          >
            {clinic.name}
          </button>
        ))}
        <button
          onClick={handleSuperAdminSelect}
          className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
        >
          Super Admin
        </button>
      </div>
    </div>
  );
} 