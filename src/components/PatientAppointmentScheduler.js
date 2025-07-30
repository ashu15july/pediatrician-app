import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, User, X, Plus, CheckCircle, Stethoscope, Shield, Activity } from 'lucide-react';
import { usePatientAuth } from '../contexts/PatientAuthContext';
import { supabase } from '../lib/supabase';

const PatientAppointmentScheduler = ({ 
  isOpen, 
  onClose, 
  onAppointmentScheduled, 
  patientId, 
  patientName, 
  doctors = [], 
  appointmentToEdit = null 
}) => {
  const { currentClinic } = usePatientAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(appointmentToEdit?.date || '');
  const [selectedTime, setSelectedTime] = useState(appointmentToEdit?.time || '');
  const [selectedDoctor, setSelectedDoctor] = useState(appointmentToEdit?.user_id || '');
  const [appointmentType, setAppointmentType] = useState(appointmentToEdit?.type || 'checkup');
  const [reason, setReason] = useState(appointmentToEdit?.reason || '');
  const [availableSlots, setAvailableSlots] = useState([]);

  // Available time slots (30-minute intervals from 9 AM to 5 PM)
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const appointmentTypes = [
    { value: 'checkup', label: 'Regular Check-up', icon: Stethoscope, color: 'from-blue-500 to-cyan-500' },
    { value: 'followup', label: 'Follow-up', icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { value: 'emergency', label: 'Emergency', icon: AlertCircle, color: 'from-red-500 to-orange-500' },
    { value: 'vaccination', label: 'Vaccination', icon: Shield, color: 'from-purple-500 to-pink-500' }
  ];

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      checkAvailableSlots();
    }
  }, [selectedDate, selectedDoctor]);

  // Set initial values when appointmentToEdit changes
  useEffect(() => {
    if (appointmentToEdit) {
      setSelectedDoctor(appointmentToEdit.user_id || '');
      setSelectedDate(appointmentToEdit.date || '');
      setSelectedTime(appointmentToEdit.time || '');
      setAppointmentType(appointmentToEdit.type || 'checkup');
      setReason(appointmentToEdit.reason || '');
    }
  }, [appointmentToEdit]);

  const checkAvailableSlots = async () => {
    try {
      // Get existing appointments for the selected date and doctor
      let query = supabase
        .from('appointments')
        .select('time')
        .eq('date', selectedDate)
        .eq('user_id', selectedDoctor)
        .eq('status', 'scheduled');

      // If editing, exclude the current appointment from the conflict check
      if (appointmentToEdit) {
        query = query.neq('id', appointmentToEdit.id);
      }

      const { data: existingAppointments, error } = await query;

      if (error) throw error;

      // Filter out booked time slots
      const bookedSlots = existingAppointments.map(apt => apt.time);
      const available = timeSlots.filter(slot => !bookedSlots.includes(slot));
      setAvailableSlots(available);
    } catch (err) {
      setAvailableSlots([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!selectedDoctor) throw new Error('Please select a doctor');
      if (!selectedDate) throw new Error('Please select a date');
      if (!selectedTime) throw new Error('Please select a time');
      if (!reason) throw new Error('Please provide a reason for the appointment');

      const appointmentData = {
        user_id: selectedDoctor,
        patient_id: patientId,
        clinic_id: currentClinic.id,
        date: selectedDate,
        time: selectedTime,
        status: 'scheduled',
        type: appointmentType,
        reason: reason,
        created_by: null // Patients are not users, so set to null for self-booked appointments
      };

      let result;
      if (appointmentToEdit) {
        // Update existing appointment
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentToEdit.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Send appointment confirmation email for new appointments
        try {
          // Get patient details for email
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('guardian_email, name')
            .eq('id', patientId)
            .single();

          if (patientError) {
            // Error fetching patient data
          } else if (patientData?.guardian_email) {
            const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
            const emailData = {
              patientEmail: patientData.guardian_email,
              patientName: patientData.name,
              appointmentDate: selectedDate,
              appointmentTime: selectedTime,
              doctorName: selectedDoctorData?.full_name || '',
              clinicName: currentClinic.name,
              clinicAddress: currentClinic.address || '',
              clinicPhone: currentClinic.phone || '',
              notes: reason,
              appointmentType: appointmentType
            };
            
            const response = await fetch('/api/send-appointment-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(emailData)
            });
            
            const responseBody = await response.json().catch(() => ({}));
            
            if (!response.ok) {
              // Email failed
            }
          }
        } catch (err) {
          // Failed to send appointment confirmation email
        }
      }

      onAppointmentScheduled(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {appointmentToEdit ? 'Edit Appointment' : 'Schedule New Appointment'}
                </h2>
                <p className="text-blue-100 text-sm">
                  {appointmentToEdit ? 'Update your appointment details' : 'Book your next healthcare visit'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

                 <div className="p-6" onClick={(e) => e.stopPropagation()}>
           {error && (
             <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center">
               <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
               <span className="font-medium">{error}</span>
             </div>
           )}

           <form onSubmit={handleSubmit} className="space-y-6" onClick={(e) => e.stopPropagation()}>
            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <User className="w-4 h-4 inline mr-2" />
                Select Doctor
              </label>
                             <select
                 value={selectedDoctor}
                 onChange={(e) => setSelectedDoctor(e.target.value)}
                 className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 relative z-10"
                 required
                 onClick={(e) => e.stopPropagation()}
               >
                <option value="">Choose your preferred doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name?.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Appointment Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Activity className="w-4 h-4 inline mr-2" />
                Appointment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {appointmentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAppointmentType(type.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        appointmentType === type.value
                          ? `border-transparent bg-gradient-to-r ${type.color} text-white shadow-lg transform scale-105`
                          : 'border-gray-200 bg-white/50 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date and Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Appointment Date
                </label>
                                 <div className="relative">
                   <input
                     type="date"
                     value={selectedDate}
                     onChange={(e) => setSelectedDate(e.target.value)}
                     min={new Date().toLocaleDateString('en-CA')}
                     className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 relative z-10"
                     required
                     onClick={(e) => e.stopPropagation()}
                   />
                   <Calendar className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Appointment Time
                </label>
                                 <div className="relative">
                   <select
                     value={selectedTime}
                     onChange={(e) => setSelectedTime(e.target.value)}
                     className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 relative z-10"
                     required
                     disabled={!selectedDate || !selectedDoctor}
                     onClick={(e) => e.stopPropagation()}
                   >
                     <option value="">Select available time</option>
                     {availableSlots.map((time) => (
                       <option key={time} value={time}>
                         {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                           hour: 'numeric',
                           minute: '2-digit',
                           hour12: true
                         })}
                       </option>
                     ))}
                   </select>
                   <Clock className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                 </div>
                {selectedDate && selectedDoctor && availableSlots.length === 0 && (
                  <p className="text-sm text-red-600 mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    No available slots for this date and doctor
                  </p>
                )}
              </div>
            </div>

            {/* Reason for Visit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Stethoscope className="w-4 h-4 inline mr-2" />
                Reason for Visit
              </label>
                             <textarea
                 value={reason}
                 onChange={(e) => setReason(e.target.value)}
                 className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 resize-none relative z-10"
                 rows="4"
                 placeholder="Please describe the reason for your appointment..."
                 required
                 onClick={(e) => e.stopPropagation()}
               />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedDoctor || !selectedDate || !selectedTime || !reason}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{appointmentToEdit ? 'Updating...' : 'Booking...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{appointmentToEdit ? 'Update Appointment' : 'Book Appointment'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientAppointmentScheduler; 