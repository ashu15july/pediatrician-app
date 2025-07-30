import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSubdomain } from '../utils/getSubdomain';

const ClinicContext = createContext();

export function useClinic() {
  return useContext(ClinicContext);
}

export function ClinicProvider({ children }) {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchClinic() {
      setLoading(true);
      setError(null);
      const subdomain = getSubdomain();
      if (!subdomain) {
        setError('No clinic subdomain found in URL.');
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('subdomain', subdomain)
          .single();
        
        if (error) {
          setError(error.message);
          setClinic(null);
        } else if (data) {
          setClinic(data);
        } else {
          setError('Clinic not found');
          setClinic(null);
        }
      } catch (err) {
        setError(err.message);
        setClinic(null);
      }
      
      setLoading(false);
    }
    fetchClinic();
  }, []);

  return (
    <ClinicContext.Provider value={{ clinic, loading, error }}>
      {children}
    </ClinicContext.Provider>
  );
} 