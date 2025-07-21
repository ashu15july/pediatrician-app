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
import LandingPage from './pages/LandingPage';
import { IAP_SCHEDULE } from './components/VaccinationTable';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import SecurityPage from './pages/SecurityPage';
import ApiPage from './pages/ApiPage';
import AboutPage from './pages/AboutPage';
import BlogPage from './pages/BlogPage';
import CareersPage from './pages/CareersPage';
import ContactPage from './pages/ContactPage';
import HelpCenterPage from './pages/HelpCenterPage';
import DocumentationPage from './pages/DocumentationPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import CookiesPage from './pages/CookiesPage';

function ClinicAppContent() {
  const { currentUser: clinicUser, isLoggedIn: isClinicLoggedIn, loading: clinicLoading } = useClinicAuth();

  // Only use clinic user
  const activeUser = clinicUser;
  const isActiveLoggedIn = isClinicLoggedIn;
  const isLoading = clinicLoading;
  
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
  const [dueVaccinations, setDueVaccinations] = useState([]);
  const [loadingVaccinations, setLoadingVaccinations] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null); // NEW: filter for appointment status

  // Helper to calculate due date for a vaccine based on DOB and age requirement
  function calculateDueDateFromDOB(dob, ageRequirement) {
    if (!dob) return '';
    const dateOfBirth = new Date(dob);
    let dueDate = new Date(dateOfBirth);
    if (ageRequirement === 'BIRTH') {
      return dateOfBirth.toISOString().split('T')[0];
    }
    const match = ageRequirement.match(/(\d+)\s*(mo|weeks|yrs)/);
    if (!match) return '';
    const [_, number, unit] = match;
    const num = parseInt(number);
    switch (unit) {
      case 'weeks':
        dueDate.setDate(dateOfBirth.getDate() + (num * 7));
        break;
      case 'mo':
        dueDate.setMonth(dateOfBirth.getMonth() + num);
        break;
      case 'yrs':
        dueDate.setFullYear(dateOfBirth.getFullYear() + num);
        break;
      default:
        return '';
    }
    return dueDate.toISOString().split('T')[0];
  }

  // Calculate due vaccinations for support/admin
  useEffect(() => {
    async function fetchAllDueVaccinations() {
      if (activeUser?.role === 'support' || activeUser?.role === 'admin') {
        if (!patients || patients.length === 0) {
          // Do NOT reset dueVaccinations to [] if patients are not loaded yet
          return;
        }
        setLoadingVaccinations(true);
        // Fetch all vaccination records for all patients
        const allPatientIds = patients.map(p => p.id);
        let allVaccRecords = [];
        if (allPatientIds.length > 0) {
          const { data, error } = await supabase
            .from('vaccinations')
            .select('id, patient_id, vaccine, due_date, given_date');
          if (!error && data) {
            allVaccRecords = data;
          }
        }
        const today = new Date();
        const in7Days = new Date();
        in7Days.setDate(today.getDate() + 7);
        const dueList = [];
        patients.forEach(patient => {
          IAP_SCHEDULE.forEach(({ age, vaccines }) => {
            vaccines.forEach(vaccine => {
              const dueDateStr = calculateDueDateFromDOB(patient.dob, age);
              if (!dueDateStr) return;
              const dueDate = new Date(dueDateStr);
              const dueDateYMD = dueDate.toISOString().split('T')[0];
              const todayYMD = today.toISOString().split('T')[0];
              const in7DaysYMD = in7Days.toISOString().split('T')[0];
              if (dueDateYMD >= todayYMD && dueDateYMD <= in7DaysYMD) {
                // Check if already given
                const alreadyGiven = allVaccRecords.some(
                  r => r.patient_id === patient.id && r.vaccine === vaccine && r.given_date
                );
                if (!alreadyGiven) {
                  dueList.push({
                    patient_id: patient.id,
                    patient_name: patient.name,
                    vaccine,
                    due_date: dueDateStr,
                  });
                }
              }
            });
          });
        });
        setDueVaccinations(dueList);
        setLoadingVaccinations(false);
      }
    }
    fetchAllDueVaccinations();
  }, [patients, activeUser]);

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
                  appointments={statusFilter ? appointments.filter(a => a.status === statusFilter) : appointments}
                  error={error}
                  onAppointmentScheduled={handleAppointmentScheduled}
                  onAppointmentDelete={handleAppointmentDelete}
                  getPatientById={getPatientById}
                  patients={patients}
                  currentUser={activeUser}
                  doctors={doctors}
                  onPatientAdded={loadPatients}
                  statusFilter={statusFilter} // pass for possible UI highlight
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
                  dueVaccinations={dueVaccinations}
                  loadingVaccinations={loadingVaccinations}
                  onStatusCardClick={setStatusFilter} // NEW: pass handler
                  statusFilter={statusFilter} // NEW: pass current filter
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
              {/* Marketing/Product Pages */}
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/api" element={<ApiPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/helpcenter" element={<HelpCenterPage />} />
              <Route path="/documentation" element={<DocumentationPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              {/* Root route - Show clinic login on subdomains or ?clinic= param, landing page otherwise */}
              <Route path="/" element={
                subdomain ? <ClinicLoginPage /> : <LandingPage />
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