import React, { useState, useEffect } from 'react';
import { Plus, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { getSubdomain } from '../utils/getSubdomain';
import NewPatientForm from './NewPatientForm';

async function sendWhatsAppMessage({ userId, clinicId, patientId, messageType, templateParams }) {
  const res = await fetch('/api/send-whatsapp-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, clinicId, patientId, messageType, templateParams })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send WhatsApp message');
  return data;
}

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

  // Determine if user is support
  const isSupportUser = activeUser && activeUser.role === 'support';
  // Determine if editing a scheduled appointment
  const isEditingScheduled = isSupportUser && existingAppointment && existingAppointment.status === 'scheduled';

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
  // Add a state for temperature in Fahrenheit for the form
  const [temperatureF, setTemperatureF] = useState('');
  // Add state for all vitals
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [headCircumference, setHeadCircumference] = useState('');

  // Use props directly
  const patients = propPatients || [];
  const doctors = propDoctors || [];

  // Time slots from 9 AM to 5 PM in 30-minute intervals
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    // If editing an existing appointment, populate the form
    if (existingAppointment) {
      // Patient: use .patient if present, else find by patient_id
      let patientObj = existingAppointment.patient || patients.find(p => p.id === existingAppointment.patient_id);
      setSelectedPatient(patientObj || null);
      setPatientSearchTerm(patientObj ? patientObj.name : '');
      // Doctor: use user_id or doctor_id
      const docId = existingAppointment.user_id || existingAppointment.doctor_id;
      setSelectedDoctor(docId || '');
      const doctorObj = doctors.find(d => d.id === docId);
      setDoctorSearchTerm(doctorObj ? doctorObj.full_name : '');
      setAppointmentType(existingAppointment.type || 'checkup');
      setTimeSlot(existingAppointment.time || '');
      setNotes(existingAppointment.notes || '');
      // Prefill temperature in Fahrenheit if available
      if (existingAppointment.temperature !== undefined && existingAppointment.temperature !== null) {
        // If temperature is in Celsius, convert to Fahrenheit
        const tempC = parseFloat(existingAppointment.temperature);
        if (!isNaN(tempC)) {
          setTemperatureF(((tempC * 9/5) + 32).toFixed(1));
        } else {
          setTemperatureF('');
        }
      } else {
        setTemperatureF('');
      }
    } else if (activeUser && activeUser.role === 'doctor' && !selectedDoctor) {
      // If user is a doctor and not editing, pre-select themselves
      const doctorRecord = (doctors || []).find(d => d.user_id === activeUser.id);
      if (doctorRecord) {
        setSelectedDoctor(doctorRecord.id);
        setDoctorSearchTerm(doctorRecord.full_name);
      }
    }
  }, [existingAppointment, patients, doctors, activeUser, selectedDoctor]);

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

      // Convert temperatureF to Celsius for saving
      let temperatureC = null;
      if (temperatureF) {
        const tempF = parseFloat(temperatureF);
        if (!isNaN(tempF)) {
          temperatureC = ((tempF - 32) * 5/9).toFixed(1);
        }
      }

      // Check for existing appointments at the same time
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .eq('date', selectedDate.toLocaleDateString('en-CA'))
        .eq('time', timeSlot)
        .eq('user_id', selectedDoctor);

      if (checkError) throw checkError;

      // If editing, filter out the current appointment from the check
      const conflictingAppointments = existingAppointment
        ? existingAppointments.filter(apt => apt.id !== existingAppointment.id)
        : existingAppointments;

      if (conflictingAppointments.length > 0) {
        throw new Error('This time slot is already booked for the selected doctor');
      }

      // Always use 'YYYY-MM-DD' format for the date in local timezone
      const appointmentDateString = selectedDate instanceof Date
        ? selectedDate.toLocaleDateString('en-CA') // en-CA format is YYYY-MM-DD
        : selectedDate;

      const appointmentData = {
        patient_id: selectedPatient.id,
        user_id: selectedDoctor,
        date: appointmentDateString,
        time: timeSlot,
        type: appointmentType,
        notes: notes,
        status: 'scheduled',
        clinic_id: clinic.id,
        created_by: activeUser?.id // Add the created_by field for staff-created appointments
      };

      let result;
      let appointmentId;
      if (existingAppointment) {
        // Update existing appointment
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', existingAppointment.id)
          .select()
          .single();
        if (updateError) {
          console.error('[handleSubmit] Error updating appointment:', updateError);
          throw updateError;
        }
        result = data;
        appointmentId = existingAppointment.id;
      } else {
        // Create new appointment directly
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
          .single();
        if (insertError) {
          console.error('[handleSubmit] Error creating appointment:', insertError);
          throw insertError;
        }
        result = data;
        appointmentId = data.id;
      }

      // Save vitals if any are entered (for support users editing scheduled appt)
      if (isSupportUser && isEditingScheduled && appointmentId && (
        height || weight || temperatureF || heartRate || bloodPressure || headCircumference || notes
      )) {
        const vitalsData = {
          patient_id: selectedPatient.id,
          appointment_id: appointmentId,
          recorded_by: activeUser.id,
          clinic_id: clinic.id,
          recorded_at: new Date().toISOString(),
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          temperature: temperatureC ? parseFloat(temperatureC) : null,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          blood_pressure: bloodPressure || null,
          head_circumference: headCircumference ? parseFloat(headCircumference) : null,
          notes: notes || null
        };
        // Upsert (insert or update) vitals for this appointment
        await supabase
          .from('patient_vitals')
          .upsert([vitalsData], { onConflict: ['appointment_id'] });
      }

      onAppointmentScheduled(result);
      onCancel();

      // Send appointment confirmation email if patient has email
      
      if (selectedPatient.guardian_email) {
        try {
          const emailData = {
            patientEmail: selectedPatient.guardian_email,
            patientName: selectedPatient.name,
            appointmentDate: appointmentDateString,
            appointmentTime: timeSlot,
            doctorName: (propDoctors.find(d => d.id === selectedDoctor)?.full_name) || '',
            clinicName: clinic.name,
            clinicAddress: clinic.address || '',
            clinicPhone: clinic.phone || '',
            notes: notes || '',
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
        } catch (err) {
          // Failed to send appointment confirmation email
        }
      }

      // Try WhatsApp message (optional, can fail without affecting appointment creation)
      try {
        await sendWhatsAppMessage({
          userId: activeUser.id,
          clinicId: clinic.id,
          patientId: selectedPatient.id,
          messageType: 'appointment_booking_confirm', // Use your actual template name
          templateParams: [
            selectedPatient.name, // {{1}} Patient's Name
            clinic.name,          // {{2}} Healthcare Facility
            `${appointmentDateString} at ${timeSlot}`, // {{3}} Date & Time details
            clinic.name           // {{4}} Healthcare Facility (again)
          ]
        });
        // Optionally show a toast/alert: "WhatsApp confirmation sent!"
      } catch (err) {
        // Optionally show a toast/alert: "Failed to send WhatsApp message"
        // WhatsApp message error
      }

    } catch (err) {
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
          setDoctorSearchTerm(selectedDoctor.full_name || '');
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
    const doctorName = doctor.full_name?.toLowerCase() || '';
    return doctorName.includes(searchLower);
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
          <select
            value={selectedDoctor}
            onChange={e => {
              setSelectedDoctor(e.target.value);
              const selected = doctors.find(d => d.id === e.target.value);
              setDoctorSearchTerm(selected ? selected.full_name : '');
            }}
            className="w-full px-4 py-2 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150 bg-white"
            required
          >
            <option value="">Select a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.full_name?.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`}
              </option>
            ))}
          </select>
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
      {(!isSupportUser || !existingAppointment || !isEditingScheduled) && (
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
      )}

      {/* Vitals Section (Support users can take vitals) */}
      {isSupportUser && isEditingScheduled && (
        <div className="space-y-2 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Record Vitals</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600">Height (cm)</label>
              <input type="number" min="40" max="200" step="0.1" value={height} onChange={e => setHeight(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-blue-200" />
              <div className="text-xs text-gray-400">Range: 40-200 cm</div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Weight (kg)</label>
              <input type="number" min="2" max="200" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-blue-200" />
              <div className="text-xs text-gray-400">Range: 2-200 kg</div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Temperature (°F)</label>
              <input
                type="number"
                min="97"
                max="100.4"
                step="0.1"
                value={temperatureF}
                onChange={e => setTemperatureF(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-blue-200"
                placeholder="Temperature (°F)"
              />
              <div className="text-xs text-gray-400">Range: 97-100.4 °F</div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Heart Rate (bpm)</label>
              <input type="number" min="40" max="200" step="1" value={heartRate} onChange={e => setHeartRate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-blue-200" />
              <div className="text-xs text-gray-400">Range: 40-200 bpm</div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Blood Pressure (mmHg)</label>
              <input type="text" pattern="\d{2,3}/\d{2,3}" value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-blue-200" />
              <div className="text-xs text-gray-400">Range: 60-180 mmHg (e.g., 120/80)</div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Head Circumference (cm)</label>
              <input type="number" min="30" max="60" step="0.1" value={headCircumference} onChange={e => setHeadCircumference(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-blue-200" />
              <div className="text-xs text-gray-400">Range: 30-60 cm</div>
            </div>
          </div>
        </div>
      )}

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