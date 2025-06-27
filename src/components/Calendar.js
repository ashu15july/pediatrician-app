import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DateAppointmentScheduler from './DateAppointmentScheduler';
import AppointmentDetailsForm from './AppointmentDetailsForm';
import PatientDetails from './PatientDetails';
import { supabase } from '../lib/supabase';
import { useClinicAuth } from '../contexts/ClinicAuthContext';

const Calendar = ({
  appointments,
  onDateSelect,
  onAppointmentSelect,
  onAppointmentEdit,
  onAppointmentDelete,
  onPatientSelect,
  onAppointmentScheduled,
  patients,
  doctors,
  currentUser,
  selectedDate,
  setSelectedDate,
  onPatientAdded
}) => {
  const { hasPermission: authHasPermission } = useAuth();
  const { hasPermission: clinicHasPermission, currentUser: clinicUser } = useClinicAuth();
  
  // Determine which permission function to use
  const hasPermission = clinicUser ? clinicHasPermission : authHasPermission;

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showRecordVitalsModal, setShowRecordVitalsModal] = useState(false);
  const [selectedAppointmentForVitals, setSelectedAppointmentForVitals] = useState(null);
  const [vitalsForm, setVitalsForm] = useState({
    height: '',
    weight: '',
    temperature: '',
    heart_rate: '',
    blood_pressure: '',
    head_circumference: '',
    notes: ''
  });
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState(null);
  const [vitalsSuccess, setVitalsSuccess] = useState(false);
  const [vitalsByAppointment, setVitalsByAppointment] = useState({});

  // Debug: log when component mounts and appointments are loaded
  useEffect(() => {
    console.log('Calendar.js: Component mounted/updated');
    console.log('Calendar.js: selectedDate:', selectedDate);
    console.log('Calendar.js: appointments count:', appointments.length);
    if (appointments.length > 0) {
      console.log('Calendar.js: First appointment:', appointments[0]);
    }
  }, [selectedDate, appointments]);

  const getPatientById = (id) => {
    return patients.find(p => p.id === id);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowAppointmentScheduler(false);
    setSelectedAppointment(null);
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentScheduler(true);
  };

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentScheduler(true);
  };

  const handleDeleteAppointment = (appointment) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      onAppointmentDelete(appointment.id);
    }
  };

  const handleAppointmentScheduled = (appointment) => {
    onAppointmentScheduled(appointment);
    setShowAppointmentScheduler(false);
    setSelectedAppointment(null);
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  const handleClosePatientDetails = () => {
    setShowPatientDetails(false);
    setSelectedPatient(null);
  };

  const getAppointmentsForDate = (date) => {
    if (!date) {
      console.log('getAppointmentsForDate: No date provided');
      return [];
    }
    
    // Convert date to local date string (YYYY-MM-DD)
    const dateString = date.toLocaleDateString('en-CA'); // en-CA format is YYYY-MM-DD
    console.log('getAppointmentsForDate: Looking for date:', dateString, 'Total appointments:', appointments.length);
    
    // Debug: log the first few appointments to see their date format
    if (appointments.length > 0) {
      console.log('getAppointmentsForDate: Sample appointments:', appointments.slice(0, 3).map(a => ({
        id: a.id,
        date: a.date,
        dateType: typeof a.date,
        dateString: typeof a.date === 'string' ? a.date.split('T')[0] : (a.date instanceof Date ? a.date.toLocaleDateString('en-CA') : 'invalid')
      })));
    }
    
    const filtered = appointments.filter(appointment => {
      // Handle different date formats and convert to local date string
      let apptDateString;
      if (typeof appointment.date === 'string') {
        apptDateString = appointment.date.split('T')[0];
      } else if (appointment.date instanceof Date) {
        apptDateString = appointment.date.toLocaleDateString('en-CA');
      } else {
        console.warn('Appointment has invalid date:', appointment);
        return false;
      }
      
      const matches = apptDateString === dateString;
      if (matches) {
        console.log('getAppointmentsForDate: Found matching appointment:', appointment.id, 'for date:', dateString);
      }
      return matches;
    });
    
    console.log('getAppointmentsForDate result:', { 
      dateString, 
      found: filtered.length,
      total: appointments.length
    });
    return filtered;
  };

  const getAppointmentsByType = (appointments) => {
    const grouped = appointments.reduce((acc, appointment) => {
      if (!acc[appointment.type]) {
        acc[appointment.type] = [];
      }
      acc[appointment.type].push(appointment);
      return acc;
    }, {});

    return Object.entries(grouped).map(([type, appointments]) => ({
      type,
      appointments: appointments.sort((a, b) => a.time.localeCompare(b.time))
    }));
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    // Add previous month's days
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -i);
      days.unshift(prevDate);
    }
    
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    setVitalsLoading(true);
    setVitalsError(null);
    setVitalsSuccess(false);
    try {
      const { height, weight, temperature, heart_rate, blood_pressure, head_circumference, notes } = vitalsForm;
      if (!height && !weight && !temperature && !heart_rate && !blood_pressure && !head_circumference) {
        setVitalsError('Please enter at least one vital.');
        setVitalsLoading(false);
        return;
      }
      const { error } = await supabase.from('patient_vitals').insert([
        {
          patient_id: selectedAppointmentForVitals.patient_id,
          appointment_id: selectedAppointmentForVitals.id,
          recorded_by: currentUser.id,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          heart_rate: heart_rate ? parseInt(heart_rate) : null,
          blood_pressure: blood_pressure || null,
          head_circumference: head_circumference ? parseFloat(head_circumference) : null,
          notes: notes || null
        }
      ]);
      if (error) throw error;
      setVitalsSuccess(true);
      setTimeout(() => {
        setShowRecordVitalsModal(false);
        setVitalsForm({ height: '', weight: '', temperature: '', heart_rate: '', blood_pressure: '', head_circumference: '', notes: '' });
        setVitalsSuccess(false);
      }, 1200);
    } catch (err) {
      setVitalsError(err.message || 'Failed to save vitals.');
    } finally {
      setVitalsLoading(false);
    }
  };

  // Fetch vitals for all appointments on the selected date (for support users)
  useEffect(() => {
    async function fetchVitalsForAppointments() {
      if (currentUser?.role === 'support' && selectedDate) {
        const dateAppointments = getAppointmentsForDate(selectedDate);
        const ids = dateAppointments.map(a => a.id);
        if (ids.length === 0) return;
        const { data, error } = await supabase
          .from('patient_vitals')
          .select('appointment_id')
          .in('appointment_id', ids);
        if (!error && data) {
          const map = {};
          data.forEach(v => { if (v.appointment_id) map[v.appointment_id] = true; });
          setVitalsByAppointment(map);
        }
      }
    }
    fetchVitalsForAppointments();
  }, [selectedDate, currentUser]);

  const renderDateCell = (date) => {
    const dateAppointments = getAppointmentsForDate(date);
    const appointmentCount = dateAppointments.length;
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const isToday = new Date().toDateString() === date.toDateString();
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

    return (
      <div
        onClick={() => handleDateClick(date)}
        className={`
          relative p-2 h-14 text-center cursor-pointer rounded-lg transition-colors
          ${isSelected ? 'bg-blue-500 text-white' : ''}
          ${!isSelected && isToday ? 'border-2 border-blue-500' : ''}
          ${!isSelected && !isToday ? 'hover:bg-gray-100' : ''}
          ${!isCurrentMonth ? 'opacity-40' : ''}
        `}
      >
        <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-700'}`}>
          {date.getDate()}
        </span>
        {appointmentCount > 0 && (
          <div className={`
            absolute bottom-1 left-1/2 transform -translate-x-1/2
            min-w-[20px] h-[20px] rounded-full flex items-center justify-center
            text-xs font-medium
            ${isSelected ? 'bg-white text-blue-500' : 'bg-blue-500 text-white'}
          `}>
            {appointmentCount}
          </div>
        )}
      </div>
    );
  };

  const renderAppointments = () => {
    if (!selectedDate) {
      console.log('renderAppointments: No selectedDate');
      return null;
    }

    const dateAppointments = getAppointmentsForDate(selectedDate);
    console.log('renderAppointments: Found', dateAppointments.length, 'appointments for', selectedDate.toLocaleDateString('en-CA'));
    
    if (dateAppointments.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No appointments scheduled for this date</p>
          {hasPermission('manage_appointments') && (
            <button
              onClick={() => setShowAppointmentScheduler(true)}
              className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150"
            >
              <Plus className="w-5 h-5 mr-1 inline" /> Schedule New Appointment
            </button>
          )}
        </div>
      );
    }

    const groupedAppointments = getAppointmentsByType(dateAppointments);

    return (
      <div className="space-y-6">
        {groupedAppointments.map(({ type, appointments }) => (
          <div key={type} className="bg-gradient-to-br from-blue-50 via-blue-100 to-green-50 rounded-2xl shadow-lg p-6 border border-blue-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 capitalize text-blue-800">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              {type} Appointments
            </h3>
            <div className="space-y-4">
              {appointments.map(appointment => {
                const patient = getPatientById(appointment.patient_id);
                if (!patient) return null;

                return (
                  <div
                    key={appointment.id}
                    className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-l-4 border-blue-200 hover:shadow-lg transition-all duration-150"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-blue-700 flex items-center gap-2 text-lg mb-1">
                        <Eye className="w-4 h-4 text-blue-400" /> {patient.name}
                      </h4>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-1">
                        <span className="inline-flex items-center gap-1"><svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M16 8v8M8 8v8" /></svg>Time: {appointment.time}</span>
                        {currentUser?.role === 'support' && appointment.doctors?.users && (
                          <span className="inline-flex items-center gap-1"><svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /></svg>Doctor: Dr. {appointment.doctors.users.full_name}{appointment.doctors.specialization && (<span className="text-blue-600 ml-1">- {appointment.doctors.specialization}</span>)}</span>
                        )}
                        {appointment.notes && (
                          <span className="inline-flex items-center gap-1"><svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>Notes: {appointment.notes}</span>
                        )}
                        {currentUser?.role === 'support' && vitalsByAppointment[appointment.id] && (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold ml-2">Vitals recorded</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3 items-center justify-end">
                      {hasPermission('view_patients') && (
                        <button
                          onClick={() => {
                            setSelectedPatient({ ...patient, appointment_id: appointment.id });
                            setSelectedDate(new Date(appointment.date));
                            setShowPatientDetails(true);
                          }}
                          className="inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 shadow hover:bg-blue-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      )}
                      {currentUser?.role === 'support' && (
                        <button
                          onClick={() => {
                            setSelectedAppointmentForVitals(appointment);
                            setShowRecordVitalsModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700 shadow hover:bg-emerald-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          <span>Record Vitals</span>
                        </button>
                      )}
                      {hasPermission('manage_appointments') && (
                        <>
                          <button
                            onClick={() => handleEditAppointment(appointment)}
                            className="inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700 shadow hover:bg-yellow-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                          >
                            <Pencil className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(appointment)}
                            className="inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold bg-red-100 text-red-700 shadow hover:bg-red-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {hasPermission('manage_appointments') && (
          <div className="mt-6">
            <button
              onClick={() => setShowAppointmentScheduler(true)}
              className="w-full px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150"
            >
              <Plus className="w-5 h-5 mr-1 inline" /> Add Appointment
            </button>
          </div>
        )}
      </div>
    );
  };

  // Debug logs
  console.log('Calendar.js patients:', patients);
  console.log('Calendar.js doctors:', doctors);
  console.log('Calendar.js appointments prop:', appointments);
  console.log('Calendar.js selectedDate:', selectedDate);
  console.log('Calendar.js appointments for selectedDate:', getAppointmentsForDate(selectedDate));

  return (
    <div className="space-y-6">
      {/* Role-based header */}
      <div className="bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-200">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <h2 className="text-2xl font-bold text-blue-800 tracking-tight">
            {currentUser?.role === 'doctor' ? 'My Appointments' : 
             currentUser?.role === 'admin' ? 'All Clinic Appointments' :
             currentUser?.role === 'support' ? 'All Clinic Appointments' : 'Appointments'}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-blue-900">{currentUser?.full_name}</div>
          <div className="text-xs text-blue-600 capitalize">{currentUser?.role}</div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(newMonth.getMonth() - 1);
              setCurrentMonth(newMonth);
            }}
            className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-blue-700" />
          </button>
          <h1 className="text-2xl font-bold text-blue-800">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h1>
          <button
            onClick={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(newMonth.getMonth() + 1);
              setCurrentMonth(newMonth);
            }}
            className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-blue-700" />
          </button>
        </div>
        {hasPermission('manage_appointments') && (
          <button
            onClick={() => setShowAppointmentScheduler(true)}
            className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            <span>Schedule Appointment</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-blue-100">
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-blue-700 py-2 bg-blue-50 rounded-xl shadow-sm tracking-wide uppercase text-xs">
                {day}
              </div>
            ))}
            {getDaysInMonth(currentMonth).map((date, i) => (
              <div key={i}>
                <button
                  onClick={() => handleDateClick(date)}
                  className={`w-full h-16 flex flex-col items-center justify-between rounded-2xl shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 border-2
                    ${selectedDate && date.toDateString() === selectedDate.toDateString() ? 'bg-gradient-to-br from-blue-200 to-emerald-100 border-blue-400 scale-105 text-blue-900 font-bold' :
                      new Date().toDateString() === date.toDateString() ? 'border-emerald-400 bg-white text-emerald-700 font-semibold' :
                      'bg-white border-transparent hover:bg-blue-50 text-gray-700'}
                    ${date.getMonth() !== currentMonth.getMonth() ? 'opacity-40' : ''}
                  `}
                  tabIndex={0}
                  aria-label={`Select ${date.toLocaleDateString()}`}
                >
                  <span className="text-base mt-2">{date.getDate()}</span>
                  {getAppointmentsForDate(date).length > 0 && (
                    <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-semibold shadow-sm
                      ${selectedDate && date.toDateString() === selectedDate.toDateString() ? 'bg-blue-500 text-white' : 'bg-emerald-200 text-emerald-800'}`}
                    >
                      {getAppointmentsForDate(date).length} appt
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {selectedDate && (
          <div className="border-t border-blue-100 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-800">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            {renderAppointments()}
          </div>
        )}

        {showAppointmentScheduler && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 relative">
              <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-blue-200">
                <div className="flex items-center gap-3">
                  <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  <h2 className="text-xl md:text-2xl font-bold text-blue-800 tracking-tight">
                    {selectedAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
                    {selectedDate && (
                      <span className="block text-sm font-normal text-blue-600 mt-1">
                        for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    )}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowAppointmentScheduler(false);
                    setSelectedAppointment(null);
                  }}
                  className="ml-4 bg-white bg-opacity-80 hover:bg-red-100 text-red-500 rounded-full p-2 shadow transition-colors border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="px-8 py-6">
                <DateAppointmentScheduler
                  selectedDate={selectedDate}
                  onAppointmentScheduled={handleAppointmentScheduled}
                  onCancel={() => {
                    setShowAppointmentScheduler(false);
                    setSelectedAppointment(null);
                  }}
                  patients={patients}
                  doctors={doctors}
                  existingAppointment={selectedAppointment}
                  onPatientAdded={onPatientAdded}
                />
              </div>
            </div>
          </div>
        )}

        {showPatientDetails && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[95vh] overflow-y-auto">
              <PatientDetails
                patient={selectedPatient}
                selectedDate={selectedDate}
                onClose={handleClosePatientDetails}
              />
            </div>
          </div>
        )}

        {showRecordVitalsModal && selectedAppointmentForVitals && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
              <h2 className="text-xl font-semibold mb-4">Record Vitals</h2>
              <button
                onClick={() => setShowRecordVitalsModal(false)}
                className="text-gray-500 hover:text-gray-700 absolute top-4 right-4"
              >
                <X className="w-6 h-6" />
              </button>
              <form onSubmit={handleVitalsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input type="number" name="height" value={vitalsForm.height} onChange={handleVitalsChange} className="w-full border rounded-lg px-3 py-2" step="0.1" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input type="number" name="weight" value={vitalsForm.weight} onChange={handleVitalsChange} className="w-full border rounded-lg px-3 py-2" step="0.1" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
                    <input type="number" name="temperature" value={vitalsForm.temperature} onChange={handleVitalsChange} className="w-full border rounded-lg px-3 py-2" step="0.1" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
                    <input type="number" name="heart_rate" value={vitalsForm.heart_rate} onChange={handleVitalsChange} className="w-full border rounded-lg px-3 py-2" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                    <input type="text" name="blood_pressure" value={vitalsForm.blood_pressure} onChange={handleVitalsChange} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., 120/80" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Head Circumference (cm)</label>
                    <input type="number" name="head_circumference" value={vitalsForm.head_circumference} onChange={handleVitalsChange} className="w-full border rounded-lg px-3 py-2" step="0.1" min="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea name="notes" value={vitalsForm.notes} onChange={handleVitalsChange} className="w-full border rounded-lg px-3 py-2" rows="2" placeholder="Any additional notes..." />
                </div>
                {vitalsError && <div className="text-red-500 text-sm">{vitalsError}</div>}
                {vitalsSuccess && <div className="text-green-600 text-sm">Vitals recorded successfully!</div>}
                <div className="flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={vitalsLoading}>
                    {vitalsLoading ? 'Saving...' : 'Save Vitals'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar; 