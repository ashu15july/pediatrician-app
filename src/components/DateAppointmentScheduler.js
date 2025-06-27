import React, { useState, useEffect } from 'react';
import { Plus, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { getSubdomain } from '../utils/getSubdomain';
import NewPatientForm from './NewPatientForm';

const DateAppointmentScheduler = ({ 
  selectedDate, 
  onCancel,
  onAppointmentScheduled,
  getPatientById,
  patients: propPatients,
  doctors: propDoctors,
  existingAppointment,
  onPatientAdded
}) => {
  const { currentUser, hasPermission: authHasPermission } = useAuth();
  const { hasPermission: clinicHasPermission, currentUser: clinicUser } = useClinicAuth();
  const { clinic } = useClinic();
  
  // Determine which permission function to use and which user is active
  const hasPermission = clinicUser ? clinicHasPermission : authHasPermission;
  const activeUser = clinicUser || currentUser; // Use clinic user if available, otherwise use regular user

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [appointmentType, setAppointmentType] = useState('checkup');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const [highlightedPatientIndex, setHighlightedPatientIndex] = useState(-1);
  const [highlightedDoctorIndex, setHighlightedDoctorIndex] = useState(-1);

  // Use props directly
  const patients = propPatients || [];
  const doctors = propDoctors || [];

  // Debug logging
  useEffect(() => {
    console.log('DateAppointmentScheduler - Received doctors:', doctors);
    console.log('DateAppointmentScheduler - Number of doctors:', doctors.length);
    if (doctors.length > 0) {
      console.log('DateAppointmentScheduler - First doctor structure:', doctors[0]);
    }
  }, [doctors]);

  // Time slots from 9 AM to 5 PM in 30-minute intervals
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    // If editing an existing appointment, populate the form
    if (existingAppointment) {
      setSelectedPatient(existingAppointment.patients);
      setSelectedDoctor(existingAppointment.doctor_id);
      setAppointmentType(existingAppointment.type);
      setTimeSlot(existingAppointment.time);
      setNotes(existingAppointment.notes || '');
    }

    // If user is a doctor, pre-select themselves
    if (activeUser && activeUser.role === 'doctor') {
      const doctorRecord = (doctors || []).find(d => d.user_id === activeUser.id);
      if (doctorRecord) {
        setSelectedDoctor(doctorRecord.id);
      }
    }
  }, [existingAppointment, propPatients, propDoctors, activeUser, doctors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!selectedPatient) throw new Error('Please select a patient');
      if (!selectedDoctor) throw new Error('Please select a doctor');
      if (!timeSlot) throw new Error('Please select a time slot');
      if (!appointmentType) throw new Error('Please select an appointment type');

      // Check for existing appointments at the same time
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .eq('date', selectedDate.toISOString().split('T')[0])
        .eq('time', timeSlot)
        .eq('doctor_id', selectedDoctor);

      if (checkError) throw checkError;

      // If editing, filter out the current appointment from the check
      const conflictingAppointments = existingAppointment
        ? existingAppointments.filter(apt => apt.id !== existingAppointment.id)
        : existingAppointments;

      if (conflictingAppointments.length > 0) {
        throw new Error('This time slot is already booked for the selected doctor');
      }

      // Always use 'YYYY-MM-DD' format for the date
      const appointmentDateString = selectedDate instanceof Date
        ? selectedDate.toISOString().split('T')[0]
        : selectedDate;

      const appointmentData = {
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor,
        date: appointmentDateString,
        time: timeSlot,
        type: appointmentType,
        notes: notes,
        status: 'scheduled',
        clinic_id: clinic.id
      };

      let result;
      if (existingAppointment) {
        // Update existing appointment
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', existingAppointment.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        // Create new appointment using RPC function
        const clinicSubdomain = localStorage.getItem('currentClinicSubdomain') || getSubdomain();
        
        if (!clinicSubdomain) {
          throw new Error('Clinic subdomain not found');
        }

        const { data, error: insertError } = await supabase
          .rpc('add_clinic_appointment', {
            clinic_subdomain: clinicSubdomain,
            appointment_patient_id: appointmentData.patient_id,
            appointment_doctor_id: appointmentData.doctor_id,
            appointment_date: appointmentData.date, // This is now always 'YYYY-MM-DD'
            appointment_time: appointmentData.time,
            appointment_status: appointmentData.status,
            appointment_type: appointmentData.type,
            appointment_reason: appointmentData.notes || '',
            user_email: activeUser?.email
          });

        if (insertError) throw insertError;
        result = data;
      }

      onAppointmentScheduled(result);
      onCancel();
    } catch (err) {
      console.error('Error saving appointment:', err);
      setError(err.message || 'Failed to save appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPatientAdded = (patient) => {
    setSelectedPatient(patient);
    setShowNewPatientForm(false);
    onPatientAdded(patient);
  };

  // Patient keyboard navigation
  const handlePatientKeyDown = (e) => {
    if (!isPatientDropdownOpen) return;
    
    const filteredPatientsList = filteredPatients;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedPatientIndex(prev => 
          prev < filteredPatientsList.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedPatientIndex(prev => 
          prev > 0 ? prev - 1 : filteredPatientsList.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedPatientIndex >= 0 && highlightedPatientIndex < filteredPatientsList.length) {
          const selectedPatient = filteredPatientsList[highlightedPatientIndex];
          setSelectedPatient(selectedPatient);
          setPatientSearchTerm(selectedPatient.name);
          setIsPatientDropdownOpen(false);
          setHighlightedPatientIndex(-1);
        }
        break;
      case 'Escape':
        setIsPatientDropdownOpen(false);
        setHighlightedPatientIndex(-1);
        break;
    }
  };

  // Doctor keyboard navigation
  const handleDoctorKeyDown = (e) => {
    if (!isDoctorDropdownOpen) return;
    
    const filteredDoctorsList = filteredDoctors;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedDoctorIndex(prev => 
          prev < filteredDoctorsList.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedDoctorIndex(prev => 
          prev > 0 ? prev - 1 : filteredDoctorsList.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedDoctorIndex >= 0 && highlightedDoctorIndex < filteredDoctorsList.length) {
          const selectedDoctor = filteredDoctorsList[highlightedDoctorIndex];
          setSelectedDoctor(selectedDoctor.id);
          setDoctorSearchTerm(selectedDoctor.user_full_name || '');
          setIsDoctorDropdownOpen(false);
          setHighlightedDoctorIndex(-1);
        }
        break;
      case 'Escape':
        setIsDoctorDropdownOpen(false);
        setHighlightedDoctorIndex(-1);
        break;
    }
  };

  // Patient dropdown filtering
  const filteredPatients = patients.filter(patient => {
    const searchLower = patientSearchTerm.toLowerCase();
    const nameMatch = patient.name?.toLowerCase().includes(searchLower);
    const guardianMatch = patient.guardian_name?.toLowerCase().includes(searchLower);
    return nameMatch || guardianMatch;
  });

  // Doctor dropdown filtering
  const filteredDoctors = doctors.filter(doctor => {
    const searchLower = doctorSearchTerm.toLowerCase();
    const doctorName = doctor.user_full_name?.toLowerCase() || '';
    const specialization = doctor.specialization?.toLowerCase() || '';
    return doctorName.includes(searchLower) || specialization.includes(searchLower);
  });

  if (patients.length === 0 || doctors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-gray-600 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Patient Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Patient
        </label>
        <div className="relative">
          <input
            type="text"
            value={patientSearchTerm}
            onChange={e => { 
              setPatientSearchTerm(e.target.value); 
              setIsPatientDropdownOpen(true); 
              setHighlightedPatientIndex(-1);
            }}
            onFocus={() => {
              setIsPatientDropdownOpen(true);
              setHighlightedPatientIndex(-1);
            }}
            onBlur={() => setTimeout(() => setIsPatientDropdownOpen(false), 200)}
            onKeyDown={handlePatientKeyDown}
            placeholder="Search patient by name..."
            className="w-full px-4 py-2 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150 bg-white"
          />
          {isPatientDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient, index) => (
                  <button
                    key={patient.id}
                    type="button"
                    onMouseDown={() => {
                      setSelectedPatient(patient);
                      setPatientSearchTerm(patient.name);
                      setIsPatientDropdownOpen(false);
                    }}
                    className={`w-full p-2 text-left hover:bg-gray-100 flex items-center space-x-2 ${highlightedPatientIndex === index ? 'bg-blue-100' : ''}`}
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{patient.name}</span>
                  </button>
                ))
              ) : (
                <div className="p-2 text-gray-500">No patients found</div>
              )}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="mt-2 p-2 bg-blue-50 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-medium">{selectedPatient.name}</p>
              <p className="text-sm text-gray-600">
                DOB: {selectedPatient.dob || 'Not available'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedPatient(null); setPatientSearchTerm(''); }}
              className="text-blue-600 hover:text-blue-800 font-semibold px-3 py-1 rounded-full bg-white border border-blue-200 shadow-sm transition-all duration-150"
            >Change</button>
          </div>
        )}

        {!selectedPatient && hasPermission('manage_patients') && (
          <button
            type="button"
            onClick={() => setShowNewPatientForm(true)}
            className="mt-2 flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-semibold px-3 py-1 rounded-full bg-white border border-blue-200 shadow-sm transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Patient</span>
          </button>
        )}
      </div>

      {/* Doctor Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Doctor
        </label>
        <div className="relative">
          <input
            type="text"
            value={doctorSearchTerm}
            onChange={e => { setDoctorSearchTerm(e.target.value); setIsDoctorDropdownOpen(true); }}
            onFocus={() => setIsDoctorDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDoctorDropdownOpen(false), 200)}
            onKeyDown={handleDoctorKeyDown}
            placeholder="Search doctor by name or specialization..."
            className="w-full px-4 py-2 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150 bg-white"
            disabled={activeUser && activeUser.role === 'doctor'}
          />
          {isDoctorDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredDoctors.length > 0 ? (
                filteredDoctors.map((doctor, index) => (
                  <button
                    key={doctor.id}
                    type="button"
                    onMouseDown={() => {
                      setSelectedDoctor(doctor.id);
                      setDoctorSearchTerm(doctor.user_full_name || '');
                      setIsDoctorDropdownOpen(false);
                    }}
                    className={`w-full p-2 text-left hover:bg-gray-100 flex items-center space-x-2 ${highlightedDoctorIndex === index ? 'bg-blue-100' : ''}`}
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{doctor.user_full_name?.startsWith('Dr') ? doctor.user_full_name : `Dr. ${doctor.user_full_name}`} - {doctor.specialization}</span>
                  </button>
                ))
              ) : (
                <div className="p-2 text-gray-500">No doctors found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Appointment Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Appointment Type
        </label>
        <select
          value={appointmentType}
          onChange={(e) => setAppointmentType(e.target.value)}
          className="w-full px-4 py-2 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150 bg-white"
        >
          <option value="checkup">Check-up</option>
          <option value="followup">Follow-up</option>
          <option value="emergency">Emergency</option>
          <option value="vaccination">Vaccination</option>
        </select>
      </div>

      {/* Time Slot */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Time Slot
        </label>
        <select
          value={timeSlot}
          onChange={(e) => setTimeSlot(e.target.value)}
          className="w-full px-4 py-2 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150 bg-white"
        >
          <option value="">Select a time...</option>
          {timeSlots.map(time => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-2 rounded-2xl border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150 bg-white"
          rows={3}
          placeholder="Add any additional notes..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-full font-semibold bg-gray-100 text-gray-700 shadow hover:bg-gray-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-2 rounded-full font-bold bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
        >
          {loading ? 'Saving...' : existingAppointment ? 'Update Appointment' : 'Schedule Appointment'}
        </button>
      </div>

      {/* New Patient Form Modal */}
      {showNewPatientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <NewPatientForm
              onClose={() => setShowNewPatientForm(false)}
              onPatientAdded={handleNewPatientAdded}
            />
          </div>
        </div>
      )}
    </form>
  );
};

export default DateAppointmentScheduler; 