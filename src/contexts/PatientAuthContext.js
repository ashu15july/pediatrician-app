import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSubdomain } from '../utils/getSubdomain';

const PatientAuthContext = createContext();

export function usePatientAuth() {
  return useContext(PatientAuthContext);
}

export function PatientAuthProvider({ children }) {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentClinic, setCurrentClinic] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get subdomain and determine clinic
    const subdomain = getSubdomain();
    if (subdomain) {
      fetchClinicBySubdomain(subdomain);
    }

    // Check if there's a stored patient in localStorage
    const storedPatient = localStorage.getItem('patientUser');
    if (storedPatient) {
      const patient = JSON.parse(storedPatient);
      setCurrentPatient(patient);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  const fetchClinicBySubdomain = async (subdomain) => {
    try {
      const { data: clinicData, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('subdomain', subdomain)
        .single();

      if (error) {
        console.error('Error fetching clinic:', error);
        return;
      }

      if (clinicData) {
        setCurrentClinic({
          subdomain: clinicData.subdomain,
          domain: clinicData.domain_url,
          name: clinicData.name,
          id: clinicData.id
        });
      }
    } catch (error) {
      console.error('Error fetching clinic by subdomain:', error);
    }
  };

  const login = async (patientId, guardianPhone) => {
    setLoading(true);
    setError(null);
    try {
      // Find patient by patient_id (the readable ID) and guardian phone
      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_id', patientId)
        .eq('guardian_phone', guardianPhone)
        .eq('clinic_id', currentClinic?.id)
        .single();

      if (error || !patient) {
        throw new Error('Invalid patient ID or phone number');
      }

      setCurrentPatient(patient);
      setIsLoggedIn(true);
      setError(null);
      localStorage.setItem('patientUser', JSON.stringify(patient));
      return { success: true };
    } catch (err) {
      setError(err.message || 'Login failed');
      setIsLoggedIn(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Get subdomain before clearing localStorage
    const subdomain = currentClinic?.subdomain;
    
    // Clear user data
    localStorage.removeItem('patientUser');
    setCurrentPatient(null);
    setIsLoggedIn(false);
    
    // Redirect to clinic page
    if (subdomain) {
      // For production, redirect to subdomain
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const redirectUrl = `https://${subdomain}.${window.location.hostname.replace(/^[^.]+\./, '')}`;
        setTimeout(() => {
          window.location.replace(redirectUrl);
        }, 100);
      } else {
        // For local development, redirect to root with clinic parameter
        const redirectUrl = `/?clinic=${subdomain}`;
        setTimeout(() => {
          window.location.replace(redirectUrl);
        }, 100);
      }
    } else {
      // Fallback to root
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    }
  };

  const value = {
    currentPatient,
    currentClinic,
    isLoggedIn,
    login,
    logout,
    loading,
    error
  };

  return (
    <PatientAuthContext.Provider value={value}>
      {children}
    </PatientAuthContext.Provider>
  );
} 