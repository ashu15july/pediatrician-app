import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ClinicAuthProvider, useClinicAuth } from './contexts/ClinicAuthContext';
import { SuperAdminAuthProvider } from './contexts/SuperAdminAuthContext';
import ClinicLoginPage from './pages/ClinicLoginPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminAuthWrapper from './components/SuperAdminAuthWrapper';
import SuperAdminApp from './SuperAdminApp';
import MainLayout from './layouts/MainLayout';
import Calendar from './components/Calendar';
import Patients from './components/Patients';
import { supabase } from './lib/supabase';
import { getSubdomain } from './utils/getSubdomain';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CalendarSidebarPanel from './components/CalendarSidebarPanel';

function ClinicAppContent() {
  const { currentUser: clinicUser, isLoggedIn: isClinicLoggedIn, loading: clinicLoading } = useClinicAuth();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Set to start of day in local timezone
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('calendar');
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinicSubdomain, setClinicSubdomain] = useState(null);

  // Only use clinic user
  const activeUser = clinicUser;
  const isActiveLoggedIn = isClinicLoggedIn;
  const isLoading = clinicLoading;

  // Get clinic subdomain from localStorage or URL
  useEffect(() => {
    const subdomain = getSubdomain();
    setClinicSubdomain(subdomain);
  }, []);

  // Load data when user is logged in and clinic subdomain is available
  useEffect(() => {
    if (isActiveLoggedIn && clinicSubdomain) {
      loadPatients();
      loadDoctors();
    } else {
      console.log('ClinicAppContent useEffect: User is not logged in or no clinic subdomain');
      console.log('ClinicAppContent useEffect: isActiveLoggedIn =', isActiveLoggedIn);
      console.log('ClinicAppContent useEffect: clinicSubdomain =', clinicSubdomain);
    }
  }, [isActiveLoggedIn, clinicSubdomain]);

  // Load appointments after patients and doctors are loaded
  useEffect(() => {
    if (isActiveLoggedIn && clinicSubdomain && patients.length > 0 && doctors.length > 0) {
      loadAppointments();
    }
  }, [isActiveLoggedIn, clinicSubdomain, patients.length, doctors.length]);

  const loadAppointments = async () => {
    if (!clinicSubdomain) return;
    try {
      // Fetch the clinic by subdomain to get the clinic id
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('id')
        .eq('subdomain', clinicSubdomain)
        .single();
      if (clinicError || !clinicData) throw clinicError || new Error('Clinic not found');
      // Fetch all appointments for the clinic (no date filter)
      let query = supabase
        .from('appointments')
        .select(`
          *,
          user:users!appointments_user_id_fkey(id, full_name, role),
          patient:patients!appointments_patient_id_fkey(id, name)
        `)
        .eq('clinic_id', clinicData.id);
      if (activeUser?.role === 'doctor') {
        query = query.eq('user_id', activeUser.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('Failed to load appointments. Please try again.');
    }
  };

  const loadPatients = async () => {
    if (!clinicSubdomain) return;
    
    try {
      // Use RPC function to get clinic-specific patients
      const { data, error } = await supabase
        .rpc('get_clinic_patients', { clinic_subdomain: clinicSubdomain });
      
      if (error) {
        throw error;
      }
      setPatients(data || []);
    } catch (err) {
      console.error('loadPatients: Error loading patients:', err);
      setError('Failed to load patients. Please try again.');
    }
  };

  const loadDoctors = async () => {
    if (!clinicSubdomain) return;
    try {
      // Fetch the clinic by subdomain to get the clinic id
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('id')
        .eq('subdomain', clinicSubdomain)
        .single();
      if (clinicError || !clinicData) throw clinicError || new Error('Clinic not found');
      // Fetch doctors from users table
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'doctor')
        .eq('clinic_id', clinicData.id);
      if (error) {
        throw error;
      }
      setDoctors(data || []);
    } catch (err) {
      console.error('loadDoctors: Error loading doctors:', err);
      setError('Failed to load doctors. Please try again.');
    }
  };

  const getPatientById = (patientId) => {
    return patients.find(patient => patient.id === patientId);
  };

  const handleAppointmentScheduled = async (newAppointment) => {
    if (newAppointment && newAppointment.date) {
      // Set selectedDate to the date of the new appointment
      const dateObj = new Date(newAppointment.date);
      // Only update if the date is different
      setSelectedDate(prev => {
        if (!prev || prev.toDateString() !== dateObj.toDateString()) {
          return dateObj;
        }
        return prev;
      });
    }
    await loadAppointments(); // Refresh appointments after scheduling
    await loadPatients(); // Also refresh patients in case of any updates
  };

  const handleAppointmentDelete = async (appointmentId) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      await loadAppointments(); // Refresh appointments after deletion
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError('Failed to delete appointment. Please try again.');
    }
  };

  // Add a separate effect for date changes
  useEffect(() => {
    if (isActiveLoggedIn && clinicSubdomain && patients.length > 0 && doctors.length > 0) {
      loadAppointments();
    }
  }, [selectedDate, isActiveLoggedIn, clinicSubdomain, patients.length, doctors.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!activeUser) {
    // Redirect to clinic login instead of showing it directly
    window.location.href = '/clinic-login';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      <MainLayout currentView={currentView} setCurrentView={setCurrentView} currentUser={activeUser}>
        <div className="container mx-auto px-4 py-8">
          {currentView === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Calendar Section */}
              <div className="lg:col-span-2">
                <Calendar
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  appointments={appointments}
                  error={error}
                  onAppointmentScheduled={handleAppointmentScheduled}
                  onAppointmentDelete={handleAppointmentDelete}
                  getPatientById={getPatientById}
                  patients={patients}
                  currentUser={activeUser}
                  doctors={doctors}
                  onPatientAdded={loadPatients}
                />
              </div>
              {/* Sidebar: Appointment/Doctor Details */}
              <div className="lg:col-span-1">
                <CalendarSidebarPanel
                  selectedDate={selectedDate}
                  doctors={doctors}
                  appointments={appointments}
                  patients={patients}
                  currentUser={activeUser}
                />
              </div>
            </div>
          )}
          {currentView === 'patients' && (
            <div className="container mx-auto px-4 py-8">
              <Patients onPatientAdded={loadPatients} />
            </div>
          )}
        </div>
      </MainLayout>
    </div>
  );
}

function App() {
  const subdomain = getSubdomain();
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  return (
    <Router>
      <ClinicAuthProvider>
        <AuthProvider>
          <SuperAdminAuthProvider>
            <Routes>
              {/* Super Admin Routes - Available on localhost without subdomain */}
              <Route path="/superadmin-login" element={<SuperAdminLoginPage />} />
              <Route path="/superadmin/*" element={
                <SuperAdminAuthWrapper>
                  <SuperAdminApp />
                </SuperAdminAuthWrapper>
              } />
              {/* Password Reset Routes */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Clinic Routes - Available on localhost with subdomain or production subdomains */}
              <Route path="/clinic-login" element={<ClinicLoginPage />} />
              <Route path="/clinic-dashboard" element={<ClinicAppContent />} />
              <Route path="/dashboard" element={<ClinicAppContent />} />
              {/* Root route - Show superadmin on localhost, clinic on subdomains */}
              <Route path="/" element={
                subdomain ? <ClinicLoginPage /> : <SuperAdminLoginPage />
              } />
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SuperAdminAuthProvider>
        </AuthProvider>
      </ClinicAuthProvider>
    </Router>
  );
}

export default App;