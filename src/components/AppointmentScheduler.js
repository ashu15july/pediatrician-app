import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { supabase } from '../lib/supabase';

const AppointmentScheduler = ({ patient, onClose, onAppointmentScheduled, defaultDate }) => {
  const { currentUser } = useAuth();
  const { currentUser: clinicUser } = useClinicAuth();
  const { clinic } = useClinic();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDate, setSelectedDate] = useState(defaultDate || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentType, setAppointmentType] = useState('checkup');
  const [reason, setReason] = useState('');

  // Available time slots (30-minute intervals from 9 AM to 5 PM)
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  // Determine which user is active
  const activeUser = clinicUser || currentUser;

  useEffect(() => {
    if (clinic?.subdomain) {
      loadDoctors();
    }
  }, [clinic]);

  useEffect(() => {
    if (defaultDate) {
      setSelectedDate(defaultDate);
    }
  }, [defaultDate]);

  const loadDoctors = async () => {
    if (!clinic?.subdomain) {
      console.log('No clinic subdomain available:', clinic);
      return;
    }
    
    console.log('AppointmentScheduler - Loading doctors for clinic:', clinic.subdomain);
    console.log('AppointmentScheduler - Clinic object:', clinic);
    
    try {
      const { data, error } = await supabase
        .rpc('get_clinic_doctors', { clinic_subdomain: clinic.subdomain });

      console.log('AppointmentScheduler - RPC response:', { data, error });
      console.log('AppointmentScheduler - RPC function called with subdomain:', clinic.subdomain);

      if (error) {
        console.error('AppointmentScheduler - RPC error:', error);
        throw error;
      }
      
      console.log('AppointmentScheduler - Doctors data received:', data);
      console.log('AppointmentScheduler - Number of doctors:', data?.length || 0);
      
      setDoctors(data || []);
      console.log('AppointmentScheduler - Doctors state updated:', data);
    } catch (err) {
      console.error('AppointmentScheduler - Error loading doctors:', err);
      setError('Failed to load doctors. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use RPC function to create appointment with proper enum handling
      const { data, error } = await supabase
        .rpc('add_clinic_appointment', {
          clinic_subdomain: clinic.subdomain,
          appointment_patient_id: patient.id,
          appointment_doctor_id: selectedDoctor,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          appointment_status: 'scheduled',
          appointment_type: appointmentType,
          appointment_reason: reason,
          user_email: activeUser?.email
        });

      if (error) throw error;

      // Create notification for the doctor
      await supabase
        .from('notifications')
        .insert([{
          user_id: doctors.find(d => d.id === selectedDoctor)?.user_id,
          type: 'appointment',
          message: `New appointment scheduled for ${patient.name} on ${selectedDate} at ${selectedTime}`,
          is_read: false
        }]);

      onAppointmentScheduled(data);
      onClose();
    } catch (err) {
      console.error('Error scheduling appointment:', err);
      setError('Failed to schedule appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Schedule Appointment</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment Type
          </label>
          <select
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          >
            <option value="checkup">Regular Check-up</option>
            <option value="followup">Follow-up</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Doctor
          </label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          >
            <option value="">Select a doctor</option>
            {doctors.map((doctor) => {
              console.log('Rendering doctor:', doctor);
              return (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user_full_name?.startsWith('Dr') ? doctor.user_full_name : `Dr. ${doctor.user_full_name}`} - {doctor.specialization}
                </option>
              );
            })}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {doctors.length} doctor(s) available for {clinic?.name || 'this clinic'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border rounded-lg px-3 py-2 pl-10"
              required
            />
            <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time
          </label>
          <div className="relative">
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 pl-10"
              required
            >
              <option value="">Select a time</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <Clock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            rows="3"
            placeholder="Enter reason for appointment"
            required
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentScheduler; 