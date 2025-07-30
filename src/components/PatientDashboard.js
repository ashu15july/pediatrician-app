import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Phone, Mail, Plus, Search, Filter, Eye, Edit, Trash2, Download, Bell, CheckCircle, AlertTriangle, Clock as ClockIcon, Activity, Heart, FileText, Shield, TrendingUp, Users, Home, Settings, X, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePatientAuth } from '../contexts/PatientAuthContext';
import PatientAppointmentScheduler from './PatientAppointmentScheduler';
import PatientVisitNotes from './PatientVisitNotes';
import EnhancedVaccinationPortal from './EnhancedVaccinationPortal';
import DocumentManagement from './DocumentManagementBase64';

import HealthTracker from './HealthTracker';
import PatientProfile from './PatientProfile';
import GrowthChart from './GrowthChart';
import MilestoneTracker from './MilestoneTracker';

const PatientDashboard = () => {
  const { currentPatient, currentClinic, isLoggedIn, loading: authLoading, logout } = usePatientAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [showDueSoonModal, setShowDueSoonModal] = useState(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    if (!authLoading && currentPatient) {
      loadDashboardData();
      loadDoctors();
    }
  }, [authLoading, currentPatient]);

  // Separate useEffect for loading doctors when editing an appointment
  useEffect(() => {
    if (selectedAppointment && currentClinic?.id) {
      loadDoctors();
    }
  }, [selectedAppointment?.user_id, currentClinic?.id]);

  // Ensure doctors are loaded when clinic is available
  useEffect(() => {
    if (currentClinic?.id && !doctors.length) {
      loadDoctors();
    }
  }, [currentClinic?.id, doctors.length]);

  const loadDashboardData = async () => {
    if (!currentPatient) return;

    try {
      setLoading(true);
      
      // Load appointments for the current patient
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          user:users!appointments_user_id_fkey(full_name, role),
          clinics(name, address)
        `)
        .eq('patient_id', currentPatient.id)
        .order('date', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);
    } catch (error) {
      // Error loading dashboard data
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    if (!currentClinic?.id) {
      return;
    }
    
    try {
      const { data: doctorsData, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('role', 'doctor')
        .eq('clinic_id', currentClinic.id);

      if (error) throw error;
      
      let doctorsList = doctorsData || [];
      
      // If we have a selected appointment for editing, ensure its doctor is in the list
      if (selectedAppointment && selectedAppointment.user_id) {
        const appointmentDoctor = doctorsList.find(d => d.id === selectedAppointment.user_id);
        if (!appointmentDoctor) {
          // Fetch the specific doctor if not in the list
          const { data: singleDoctor, error: singleError } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('id', selectedAppointment.user_id)
            .single();
          
          if (!singleError && singleDoctor) {
            doctorsList = [singleDoctor, ...doctorsList];
          }
        }
      }
      
      setDoctors(doctorsList);
    } catch (error) {
      // Error loading doctors
    }
  };

  const handleAppointmentScheduled = async (newAppointment) => {
    await loadDashboardData();
    setShowAppointmentModal(false);
  };

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowEditAppointmentModal(true);
  };

  const openScheduleAppointmentModal = () => {
    setSelectedAppointment(null);
    setShowAppointmentModal(true);
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      await loadDashboardData();
    } catch (error) {
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  const handleAppointmentUpdated = async (updatedAppointment) => {
    await loadDashboardData();
    setShowEditAppointmentModal(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getAppointmentStatus = (appointment) => {
    const today = new Date();
    const appointmentDate = new Date(appointment.date);
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);

    if (appointment.status === 'cancelled') return 'cancelled';
    if (appointment.status === 'completed') return 'completed';
    if (appointment.status === 'missed') return 'missed';
    
    if (appointmentDateTime < today) return 'missed';
    if (appointmentDate.toDateString() === today.toDateString()) return 'today';
    if (appointmentDateTime > today) return 'upcoming';
    
    return 'scheduled';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'today':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'missed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const upcomingAppointments = appointments.filter(appointment => 
    getAppointmentStatus(appointment) === 'upcoming' || getAppointmentStatus(appointment) === 'today'
  );

  const recentAppointments = appointments.filter(appointment => 
    getAppointmentStatus(appointment) === 'completed'
  ).slice(0, 5);

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || getAppointmentStatus(appointment) === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isLoggedIn || !currentPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome Back</h2>
            <p className="text-gray-600 mb-8 text-lg">Please log in to access your personalized health dashboard.</p>
            <a 
              href="/patient-login" 
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <User className="w-5 h-5 mr-2" />
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Appointment', icon: Calendar, color: 'from-blue-500 to-cyan-500' },
    { id: 'profile', name: 'Profile', icon: User, color: 'from-purple-500 to-pink-500' },
    { id: 'health', name: 'Health', icon: Activity, color: 'from-green-500 to-emerald-500' },
    { id: 'care', name: 'Care', icon: Shield, color: 'from-orange-500 to-red-500' },
    { id: 'documents', name: 'Documents', icon: FileText, color: 'from-indigo-500 to-purple-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Health Dashboard
                </h1>
                <p className="text-gray-600 text-sm">
                  Welcome back, {currentPatient?.name}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <Home className="w-4 h-4" />
                <span>{currentClinic?.name || 'Medical Center'}</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={logout}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <nav className="flex space-x-2 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                      activeTab === tab.id
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div 
                onClick={() => setShowUpcomingModal(true)}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Upcoming</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      {upcomingAppointments.length}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
              </div>

              <div 
                onClick={() => setShowCompletedModal(true)}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {recentAppointments.length}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
              </div>

              <div 
                onClick={() => setShowRemindersModal(true)}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Reminders</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">3</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              </div>

              <div 
                onClick={() => setShowDueSoonModal(true)}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Due Soon</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">2</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Upcoming Appointments</h2>
                      <p className="text-blue-100 text-sm">Your scheduled visits</p>
                    </div>
                  </div>
                  <button 
                    onClick={openScheduleAppointmentModal}
                    className="flex items-center space-x-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold">Schedule</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Calendar className="h-10 w-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Upcoming Appointments</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      You don't have any scheduled appointments at the moment. Schedule your first appointment to get started.
                    </p>
                    <button 
                      onClick={openScheduleAppointmentModal}
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Schedule Your First Appointment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment, index) => (
                      <div 
                        key={appointment.id} 
                        className="group bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                              <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                {appointment.user?.full_name || 'Doctor'}
                              </h4>
                              <p className="text-sm text-gray-600">{appointment.reason}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(appointment.date)} at {formatTime(appointment.time)}
                                </span>
                                {appointment.clinics?.address && (
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {appointment.clinics.address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(getAppointmentStatus(appointment))}`}>
                              {getAppointmentStatus(appointment)}
                            </span>
                            <button
                              onClick={() => handleEditAppointment(appointment)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8">
            <PatientProfile
              patientId={currentPatient?.id}
              patientName={currentPatient?.name}
              patientDOB={currentPatient?.dob}
            />
          </div>
        )}

        {activeTab === 'health' && (
          <div className="space-y-8">
            <HealthTracker
              patientId={currentPatient?.id}
              patientName={currentPatient?.name}
              patientAge={currentPatient?.age}
              patientDOB={currentPatient?.dob}
              patientGender={currentPatient?.gender}
            />
          </div>
        )}

        {activeTab === 'care' && (
          <div className="space-y-8">
            <EnhancedVaccinationPortal
              patientId={currentPatient?.id}
              patientName={currentPatient?.name}
              patientDOB={currentPatient?.dob}
            />
            
            {/* Appointments Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">All Appointments</h2>
                      <p className="text-green-100 text-sm">Manage your healthcare visits</p>
                    </div>
                  </div>
                  <button 
                    onClick={openScheduleAppointmentModal}
                    className="flex items-center space-x-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold">Schedule</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search appointments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="missed">Missed</option>
                    </select>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="space-y-4">
                  {filteredAppointments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="h-10 w-10 text-green-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No Appointments Found</h3>
                      <p className="text-gray-600">No appointments match your current search criteria.</p>
                    </div>
                  ) : (
                    filteredAppointments.map((appointment, index) => (
                      <div 
                        key={appointment.id} 
                        className="group bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                              <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                                {appointment.user?.full_name || 'Doctor'}
                              </h4>
                              <p className="text-sm text-gray-600">{appointment.reason}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(appointment.date)} at {formatTime(appointment.time)}
                                </span>
                                {appointment.clinics?.address && (
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {appointment.clinics.address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(getAppointmentStatus(appointment))}`}>
                              {getAppointmentStatus(appointment)}
                            </span>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={() => handleEditAppointment(appointment)}
                                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelAppointment(appointment.id)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-8">
            <DocumentManagement
              patientId={currentPatient?.id}
              patientName={currentPatient?.name}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showAppointmentModal && (
        <PatientAppointmentScheduler
          isOpen={showAppointmentModal}
          onClose={() => setShowAppointmentModal(false)}
          onAppointmentScheduled={handleAppointmentScheduled}
          patientId={currentPatient?.id}
          patientName={currentPatient?.name}
          doctors={doctors}
        />
      )}

      {showEditAppointmentModal && selectedAppointment && (
        <PatientAppointmentScheduler
          isOpen={showEditAppointmentModal}
          onClose={() => setShowEditAppointmentModal(false)}
          onAppointmentScheduled={handleAppointmentUpdated}
          patientId={currentPatient?.id}
          patientName={currentPatient?.name}
          doctors={doctors}
          appointmentToEdit={selectedAppointment}
        />
      )}

      {/* Detailed Modals */}
      {showUpcomingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Upcoming Appointments</h2>
                    <p className="text-blue-100 text-sm">Your scheduled healthcare visits</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpcomingModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Upcoming Appointments</h3>
                  <p className="text-gray-600 mb-6">You don't have any scheduled appointments at the moment.</p>
                  <button 
                    onClick={() => {
                      setShowUpcomingModal(false);
                      openScheduleAppointmentModal();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Schedule New Appointment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment, index) => (
                    <div 
                      key={appointment.id} 
                      className="group bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                              {appointment.user?.full_name || 'Doctor'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{appointment.reason}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDate(appointment.date)} at {formatTime(appointment.time)}
                              </span>
                              {appointment.clinics?.address && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {appointment.clinics.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(getAppointmentStatus(appointment))}`}>
                            {getAppointmentStatus(appointment)}
                          </span>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                              onClick={() => {
                                setShowUpcomingModal(false);
                                handleEditAppointment(appointment);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit appointment"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Cancel appointment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCompletedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Completed Appointments</h2>
                    <p className="text-green-100 text-sm">Your past healthcare visits</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCompletedModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {recentAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Completed Appointments</h3>
                  <p className="text-gray-600">You haven't completed any appointments yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAppointments.map((appointment, index) => (
                    <div 
                      key={appointment.id} 
                      className="group bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                              {appointment.user?.full_name || 'Doctor'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{appointment.reason}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDate(appointment.date)} at {formatTime(appointment.time)}
                              </span>
                              {appointment.clinics?.address && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {appointment.clinics.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(getAppointmentStatus(appointment))}`}>
                            {getAppointmentStatus(appointment)}
                          </span>
                          <button
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRemindersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Health Reminders</h2>
                    <p className="text-purple-100 text-sm">Important health notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRemindersModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="group bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                        Annual Check-up Due
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">Your annual pediatric check-up is scheduled for next month</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Due in 2 weeks
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Dr. Sarah Johnson
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300">
                      Schedule
                    </button>
                  </div>
                </div>

                <div className="group bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        Vaccination Reminder
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">MMR vaccine booster is due for your child</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Due in 1 week
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Dr. Michael Chen
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300">
                      Schedule
                    </button>
                  </div>
                </div>

                <div className="group bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100 hover:border-orange-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                        Growth Monitoring
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">Time for your child's growth and development assessment</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Due in 3 weeks
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Dr. Emily Rodriguez
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300">
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDueSoonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Due Soon</h2>
                    <p className="text-orange-100 text-sm">Urgent health items requiring attention</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDueSoonModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="group bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-100 hover:border-red-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                        Emergency Follow-up
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">Follow-up appointment for recent emergency visit</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Due tomorrow
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Dr. Sarah Johnson
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-all duration-300">
                      Reschedule
                    </button>
                  </div>
                </div>

                <div className="group bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100 hover:border-yellow-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover:text-yellow-600 transition-colors">
                        Vaccination Overdue
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">DTaP vaccine is overdue by 1 week</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Overdue by 1 week
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Dr. Michael Chen
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300">
                      Schedule Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard; 