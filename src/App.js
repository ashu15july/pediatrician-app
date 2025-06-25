import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClinicAuthProvider, useClinicAuth } from './contexts/ClinicAuthContext';
import { SuperAdminAuthProvider } from './contexts/SuperAdminAuthContext';
import LoginPage from './pages/LoginPage';
import ClinicLoginPage from './pages/ClinicLoginPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminAuthWrapper from './components/SuperAdminAuthWrapper';
import SuperAdminApp from './SuperAdminApp';
import UserTypeSelector from './components/UserTypeSelector';
import MainLayout from './layouts/MainLayout';
import Calendar from './components/Calendar';
import Patients from './components/Patients';
import PatientDetails from './components/PatientDetails';
import SupabaseTest from './components/SupabaseTest';
import { supabase } from './lib/supabase';
import { getSubdomain } from './utils/getSubdomain';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Mock data for appointments
const mockAppointments = [
  {
    id: 1,
    patientName: 'John Doe',
    date: '2024-03-20',
    time: '09:00',
    type: 'Check-up',
    status: 'scheduled'
  },
  {
    id: 2,
    patientName: 'Jane Smith',
    date: '2024-03-20',
    time: '10:30',
    type: 'Follow-up',
    status: 'scheduled'
  }
];

// Mock data for patients
const mockPatients = [
  {
    id: 1,
    name: 'John Doe',
    age: 5,
    guardian: 'Mary Doe',
    phone: '123-456-7890',
    email: 'mary@example.com',
    address: '123 Main St',
    medicalHistory: 'No significant history'
  },
  {
    id: 2,
    name: 'Jane Smith',
    age: 7,
    guardian: 'John Smith',
    phone: '098-765-4321',
    email: 'john@example.com',
    address: '456 Oak St',
    medicalHistory: 'Allergic to penicillin'
  }
];

function ClinicAppContent() {
  console.log('ClinicAppContent: Component rendering');
  const { currentUser: clinicUser, isLoggedIn: isClinicLoggedIn, loading: clinicLoading } = useClinicAuth();
  console.log('ClinicAppContent: Clinic Auth state - clinicUser:', clinicUser, 'isClinicLoggedIn:', isClinicLoggedIn, 'clinicLoading:', clinicLoading);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
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
    console.log('ClinicAppContent useEffect: getSubdomain() returned:', subdomain);
    setClinicSubdomain(subdomain);
    console.log('ClinicAppContent useEffect: clinicSubdomain set to:', subdomain);
  }, []);

  useEffect(() => {
    console.log('ClinicAppContent useEffect: isActiveLoggedIn =', isActiveLoggedIn);
    console.log('ClinicAppContent useEffect: clinicSubdomain =', clinicSubdomain);
    if (isActiveLoggedIn && clinicSubdomain) {
      console.log('ClinicAppContent useEffect: User is logged in, loading clinic data for:', clinicSubdomain);
      loadAppointments();
      loadPatients();
      loadDoctors();
    } else {
      console.log('ClinicAppContent useEffect: User is not logged in or no clinic subdomain');
      console.log('ClinicAppContent useEffect: isActiveLoggedIn =', isActiveLoggedIn);
      console.log('ClinicAppContent useEffect: clinicSubdomain =', clinicSubdomain);
    }
  }, [isActiveLoggedIn, clinicSubdomain]);

  // Debug logs
  useEffect(() => {
    console.log('ClinicAppContent patients:', patients);
    console.log('ClinicAppContent doctors:', doctors);
  }, [patients, doctors]);

  const loadAppointments = async () => {
    if (!clinicSubdomain) return;
    
    try {
      setError(null);
      
      // Determine which function to use based on user role
      let functionName = 'get_clinic_appointments'; // Default function that handles role-based access
      
      // For debugging, we can also use specific functions
      if (activeUser?.role === 'doctor') {
        functionName = 'get_doctor_appointments';
      } else if (activeUser?.role === 'admin' || activeUser?.role === 'support') {
        functionName = 'get_all_clinic_appointments';
      }
      
      // Debug: log the parameters being sent to the RPC call
      console.log('Calling RPC with:', { functionName, clinic_subdomain: clinicSubdomain, p_user_email: activeUser?.email });
      
      // Use RPC function to get role-appropriate appointments
      const { data, error } = await supabase
        .rpc(functionName, { 
          clinic_subdomain: clinicSubdomain,
          p_user_email: activeUser?.email 
        });
      // Debug: log the response from the RPC call
      console.log('Supabase RPC response:', { data, error });

      if (error) throw error;
      console.log('Loaded appointments for role', activeUser?.role, ':', data);
      setAppointments(data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('Failed to load appointments. Please try again.');
    }
  };

  const loadPatients = async () => {
    if (!clinicSubdomain) return;
    
    try {
      console.log('loadPatients: Starting to load patients for clinic:', clinicSubdomain);
      
      // Use RPC function to get clinic-specific patients
      const { data, error } = await supabase
        .rpc('get_clinic_patients', { clinic_subdomain: clinicSubdomain });
      
      console.log('loadPatients: Supabase response - data:', data, 'error:', error);
      if (error) {
        console.error('loadPatients: Supabase error:', error);
        throw error;
      }
      console.log('loadPatients: Setting patients state with:', data);
      setPatients(data || []);
    } catch (err) {
      console.error('loadPatients: Error loading patients:', err);
      setError('Failed to load patients. Please try again.');
    }
  };

  const loadDoctors = async () => {
    if (!clinicSubdomain) return;
    
    try {
      console.log('loadDoctors: Starting to load doctors for clinic:', clinicSubdomain);
      
      // Use RPC function to get clinic-specific doctors
      const { data, error } = await supabase
        .rpc('get_clinic_doctors', { clinic_subdomain: clinicSubdomain });
      
      console.log('loadDoctors: Supabase response - data:', data, 'error:', error);
      if (error) {
        console.error('loadDoctors: Supabase error:', error);
        throw error;
      }
      console.log('loadDoctors: Setting doctors state with:', data);
      setDoctors(data || []);
    } catch (err) {
      console.error('loadDoctors: Error loading doctors:', err);
      setError('Failed to load doctors. Please try again.');
    }
  };

  const getPatientById = (patientId) => {
    return patients.find(patient => patient.id === patientId);
  };

  const handleAppointmentScheduled = async () => {
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
    if (isActiveLoggedIn) {
      loadAppointments();
    }
  }, [selectedDate]);

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
    <div className="min-h-screen bg-gray-100">
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

              {/* Patients Section */}
              <div className="lg:col-span-1">
                <Patients />
              </div>
            </div>
          )}
          {currentView === 'patients' && (
            <div className="container mx-auto px-4 py-8">
              <Patients />
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
  
  console.log('App: Current subdomain:', subdomain);
  console.log('App: Is localhost:', isLocalhost);

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