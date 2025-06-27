import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Calendar, User, Phone, MapPin, Heart, AlertTriangle, Check, Clock, Edit, Trash2, Activity, Syringe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { addVisitNote, getVisitNotes } from '../services/patientService';
import VaccinationTable from './VaccinationTable';
import AppointmentScheduler from './AppointmentScheduler';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ScatterChart } from 'recharts';
import growthReference from '../data/growth_reference.json';
import milestonesData from '../data/milestones.json';
import { useClinic } from '../contexts/ClinicContext';

// Helper: Calculate age in months
function getAgeInMonths(dob, date) {
  const birth = new Date(dob);
  const d = new Date(date);
  return (d.getFullYear() - birth.getFullYear()) * 12 + (d.getMonth() - birth.getMonth());
}

// Example: Static milestones by age in months
const MILESTONES = [
  { age: 2, items: ['Smiles at people', 'Can briefly calm themselves', 'Coos, makes gurgling sounds'] },
  { age: 4, items: ['Babbles with expression', 'Holds head steady', 'Pushes down on legs when feet on surface'] },
  { age: 6, items: ['Responds to own name', 'Rolls over in both directions', 'Begins to sit without support'] },
  { age: 9, items: ['Understands "no"', 'Stands, holding on', 'Plays peek-a-boo'] },
  { age: 12, items: ['Says "mama" or "dada"', 'Pulls up to stand', 'May take a few steps'] },
  { age: 18, items: ['Says several single words', 'Walks alone', 'Points to show things'] },
  { age: 24, items: ['Says sentences with 2-4 words', 'Kicks a ball', 'Begins to sort shapes/colors'] },
  // ... add more as needed
];

// Add static reference data for demo
const GROWTH_REFERENCE = {
  10: { height: 74, weight: 9.2, head_circumference: 45.5 },
  11: { height: 75, weight: 9.4, head_circumference: 46 },
  12: { height: 76, weight: 9.6, head_circumference: 46.3 },
  13: { height: 77, weight: 9.8, head_circumference: 46.6 },
  14: { height: 78, weight: 10.0, head_circumference: 46.8 },
  15: { height: 79, weight: 10.2, head_circumference: 47.0 },
  // ...add more ages as needed
};

function getGrowthReference(ageMonths, gender) {
  const group = gender === 'Female' ? 'girls' : 'boys';
  return (
    growthReference.growthChart[group].find(row => row.ageMonths === ageMonths) || {}
  );
}

function getGrowthData(gender, patientVitals, valueType) {
  const group = gender === 'Female' ? 'girls' : 'boys';
  const refRows = growthReference.growthChart[group];
  // Map patient vitals by ageMonths for quick lookup
  const patientByAge = {};
  patientVitals.forEach(v => {
    const ageMonths = v.ageMonths;
    if (ageMonths != null) {
      patientByAge[ageMonths] = v[valueType];
    }
  });
  if (valueType === 'weight') {
    return refRows.map(row => ({
      ageMonths: row.ageMonths,
      min: row.weightMinKg,
      avg: row.weightAvgKg,
      max: row.weightMaxKg,
      patient: patientByAge[row.ageMonths] !== undefined ? patientByAge[row.ageMonths] : null
    }));
  } else if (valueType === 'height') {
    return refRows.map(row => ({
      ageMonths: row.ageMonths,
      min: row.heightMinCm,
      avg: row.heightAvgCm,
      max: row.heightMaxCm,
      patient: patientByAge[row.ageMonths] !== undefined ? patientByAge[row.ageMonths] : null
    }));
  }
  return [];
}

// Add this helper for a custom star shape
function StarShape(props) {
  const { cx, cy, fill } = props;
  if (cx == null || cy == null) {
    console.log('StarShape missing cx/cy:', props);
    return null;
  }
  return (
    <svg x={cx - 16} y={cy - 16} width={32} height={32} viewBox="0 0 32 32">
      <polygon
        points="16,2 20.14,11.78 31.22,11.78 22.54,18.22 26.68,28 16,21.44 5.32,28 9.46,18.22 0.78,11.78 11.86,11.78"
        fill={fill || 'red'}
        stroke="red"
        strokeWidth="2"
      />
    </svg>
  );
}

const scatterData = [
  { x: 100, y: 200 },
  { x: 120, y: 100 },
  { x: 170, y: 300 },
  { x: 140, y: 250 },
  { x: 150, y: 400 },
  { x: 110, y: 280 },
];

const PatientDetails = ({ patient, selectedDate, onClose, onAppointmentScheduled, onUpdate, onDelete }) => {
  const { hasPermission: authHasPermission, currentUser: authUser } = useAuth();
  const { hasPermission: clinicHasPermission, currentUser: clinicUser } = useClinicAuth();
  
  // Determine which permission function to use
  const hasPermission = clinicUser ? clinicHasPermission : authHasPermission;
  const currentUser = clinicUser || authUser;
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitType, setVisitType] = useState('New');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [developmentStatus, setDevelopmentStatus] = useState('Normal');
  const [developmentDelayDetails, setDevelopmentDelayDetails] = useState('');
  const [physicalExam, setPhysicalExam] = useState({
    general: 'Active',
    chest_lungs: 'Clear',
    abdomen: 'Soft',
    skin: 'Normal',
    ent: 'Normal'
  });
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState({
    medications: '',
    advice: '',
    vaccines_given: false,
    vaccines_details: ''
  });
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [vitals, setVitals] = useState({
    height: '',
    weight: '',
    temperature: '',
    heartRate: '',
    bloodPressure: '',
    headCircumference: ''
  });
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);

  const [vitalWarnings, setVitalWarnings] = useState({
    height: '',
    weight: '',
    temperature: '',
    heartRate: '',
    bloodPressure: '',
    headCircumference: ''
  });

  const [activeTab, setActiveTab] = useState('notes');

  const [editingMedicalHistory, setEditingMedicalHistory] = useState(false);
  const [medicalHistoryDraft, setMedicalHistoryDraft] = useState(patient.medical_history || '');
  const canEditMedicalHistory = hasPermission;

  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpConfirmation, setFollowUpConfirmation] = useState('');

  const [futureAppointments, setFutureAppointments] = useState([]);

  const [vitalsHistory, setVitalsHistory] = useState([]);

  const [milestoneStatus, setMilestoneStatus] = useState({});

  const [expandedNotes, setExpandedNotes] = useState({});

  const { clinic } = useClinic();

  useEffect(() => {
    if (patient?.id) {
      loadNotes();
    }
  }, [patient?.id]);

  useEffect(() => {
    if (patient?.id && selectedDate && currentUser?.role === 'doctor') {
      // Fetch latest vitals for this patient and appointment (if available)
      const fetchVitals = async () => {
        let query = supabase
          .from('patient_vitals')
          .select('*')
          .eq('patient_id', patient.id);
        if (patient.appointment_id) {
          query = query.eq('appointment_id', patient.appointment_id);
        } else {
          // fallback: fetch by date if appointment_id is not available
          const dateStr = selectedDate.toLocaleDateString('en-CA');
          query = query.gte('recorded_at', dateStr + 'T00:00:00').lte('recorded_at', dateStr + 'T23:59:59');
        }
        const { data, error } = await query.order('recorded_at', { ascending: false }).limit(1);
        if (!error && data && data.length > 0) {
          const v = data[0];
          setVitals(prev => ({
            height: prev.height || v.height || '',
            weight: prev.weight || v.weight || '',
            temperature: prev.temperature || v.temperature || '',
            heartRate: prev.heartRate || v.heart_rate || '',
            bloodPressure: prev.bloodPressure || v.blood_pressure || '',
            headCircumference: prev.headCircumference || v.head_circumference || ''
          }));
        }
      };
      fetchVitals();
    }
  }, [patient?.id, patient?.appointment_id, selectedDate, currentUser?.role]);

  useEffect(() => {
    // Fetch future appointments for this patient
    const fetchFutureAppointments = async () => {
      if (!patient?.id) return;
      const today = new Date().toLocaleDateString('en-CA');
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .gte('date', today)
        .order('date', { ascending: true });
      if (!error && data) {
        setFutureAppointments(data);
      }
    };
    fetchFutureAppointments();
  }, [patient?.id, showAppointmentScheduler]);

  useEffect(() => {
    // Fetch all vitals for this patient for growth chart
    const fetchVitalsHistory = async () => {
      if (!patient?.id) return;
      const { data, error } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', patient.id)
        .order('recorded_at', { ascending: true });
      if (!error && data) {
        setVitalsHistory(data);
      }
    };
    fetchVitalsHistory();
  }, [patient?.id]);

  const loadNotes = async () => {
    if (!patient?.id || !clinic?.id) {
      console.error('No patient ID or clinic ID available');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getVisitNotes(patient.id, clinic.id);
      setNotes(data);
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to load visit notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateVitals = (values) => {
    const validated = { ...values };
    const warnings = { ...vitalWarnings };
    
    // Height: 40-200 cm
    if (values.height) {
      const height = parseFloat(values.height);
      if (height < 40 || height > 200) {
        warnings.height = 'Height should be between 40 and 200 cm';
      } else {
        warnings.height = '';
      }
      validated.height = height;
    }
    
    // Weight: 1-16 kg
    if (values.weight) {
      const weight = parseFloat(values.weight);
      if (weight < 1 || weight > 16) {
        warnings.weight = 'Weight should be between 1 and 16 kg';
      } else {
        warnings.weight = '';
      }
      validated.weight = weight;
    }
    
    // Temperature: 90-110 °F
    if (values.temperature) {
      const temp = parseFloat(values.temperature);
      if (temp < 90 || temp > 110) {
        warnings.temperature = 'Temperature should be between 90 and 110 °F';
      } else {
        warnings.temperature = '';
      }
      validated.temperature = temp;
    }
    
    // Heart Rate: 70-200 bpm
    if (values.heartRate) {
      const hr = parseInt(values.heartRate);
      if (hr < 70 || hr > 200) {
        warnings.heartRate = 'Heart rate should be between 70 and 200 bpm';
      } else {
        warnings.heartRate = '';
      }
      validated.heartRate = hr;
    }
    
    // Head Circumference: 30-60 cm
    if (values.headCircumference) {
      const hc = parseFloat(values.headCircumference);
      if (hc < 30 || hc > 60) {
        warnings.headCircumference = 'Head circumference should be between 30 and 60 cm';
      } else {
        warnings.headCircumference = '';
      }
      validated.headCircumference = hc;
    }

    // Blood Pressure: Format validation (e.g., "120/80")
    if (values.bloodPressure) {
      const bpRegex = /^\d{2,3}\/\d{2,3}$/;
      if (!bpRegex.test(values.bloodPressure)) {
        warnings.bloodPressure = 'Blood pressure should be in format "120/80"';
      } else {
        const [systolic, diastolic] = values.bloodPressure.split('/').map(Number);
        if (systolic < 60 || systolic > 200 || diastolic < 40 || diastolic > 120) {
          warnings.bloodPressure = 'Blood pressure values seem unusual. Please verify.';
        } else {
          warnings.bloodPressure = '';
        }
      }
    }
    
    setVitalWarnings(warnings);
    return validated;
  };

  const handleVitalChange = (field, value) => {
    const validatedValue = validateVitals({ [field]: value })[field];
    setVitals(prev => ({ ...prev, [field]: value }));
  };

  const fahrenheitToCelsius = (fahrenheit) => {
    return ((fahrenheit - 32) * 5) / 9;
  };

  const handleAddNote = async (e) => {
    e.preventDefault();

    // Check if there are any warnings
    const hasWarnings = Object.values(vitalWarnings).some(warning => warning !== '');
    if (hasWarnings) {
      setError('Please correct the vital measurements before saving.');
      return;
    }

    // Additional required field validation
    if (!patient?.id) {
      setError('Patient information is missing');
      return;
    }

    if (!currentUser?.id) {
      setError('User information is missing. Please log in again.');
      return;
    }

    // Example: require at least one milestone to be checked (optional, can be removed)
    // const hasMilestone = Object.keys(milestoneStatus).length > 0;
    // if (!hasMilestone) {
    //   setError('Please review developmental milestones.');
    //   return;
    // }

    try {
      setError(null);
      const validatedVitals = validateVitals(vitals);
      const noteData = {
        patient_id: patient.id,
        doctor_id: currentUser.id,
        visit_date: selectedDate.toLocaleDateString('en-CA'),
        visit_type: visitType,
        chief_complaint: chiefComplaint,
        development_status: developmentStatus,
        development_delay_details: developmentStatus === 'Delay' ? developmentDelayDetails : null,
        physical_exam: physicalExam,
        diagnosis: diagnosis,
        treatment_plan: treatmentPlan,
        vitals: {
          height: validatedVitals.height || null,
          weight: validatedVitals.weight || null,
          temperature: validatedVitals.temperature || null,
          heart_rate: validatedVitals.heartRate || null,
          blood_pressure: vitals.bloodPressure || null,
          head_circumference: validatedVitals.headCircumference || null
        },
        development_milestones: milestoneStatus,
      };

      if (followUpRequired && followUpDate) {
        noteData.follow_up_date = followUpDate;
        noteData.follow_up_notes = followUpNotes;
      }

      await addVisitNote(noteData);
      
      // Auto-create follow-up appointment if followUpDate is filled
      if (followUpDate) {
        const { error: apptError } = await supabase.from('appointments').insert([
          {
            patient_id: patient.id,
            doctor_id: currentUser.id,
            date: followUpDate,
            time: '09:00', // default time, can be changed
            status: 'scheduled',
            type: 'followup',
            reason: 'Follow-up',
            notes: followUpNotes || null,
            created_by: currentUser.id,
            created_at: new Date().toISOString()
          }
        ]);
        // Optionally handle apptError
      }
      
      // Reset all form fields
      setNewNote('');
      setVisitType('New');
      setChiefComplaint('');
      setDevelopmentStatus('Normal');
      setDevelopmentDelayDetails('');
      setPhysicalExam({
        general: 'Active',
        chest_lungs: 'Clear',
        abdomen: 'Soft',
        skin: 'Normal',
        ent: 'Normal'
      });
      setDiagnosis('');
      setTreatmentPlan({
        medications: '',
        advice: '',
        vaccines_given: false,
        vaccines_details: ''
      });
      setFollowUpDate('');
      setFollowUpNotes('');
      setVitals({
        height: '',
        weight: '',
        temperature: '',
        heartRate: '',
        bloodPressure: '',
        headCircumference: ''
      });
      setVitalWarnings({
        height: '',
        weight: '',
        temperature: '',
        heartRate: '',
        bloodPressure: '',
        headCircumference: ''
      });
      
      await loadNotes();
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note. Please try again.');
    }
  };

  const handleSaveMedicalHistory = async () => {
    // Save to database
    const { error } = await supabase
      .from('patients')
      .update({ medical_history: medicalHistoryDraft })
      .eq('id', patient.id)
      .eq('clinic_id', clinic.id);
    if (!error) {
      setEditingMedicalHistory(false);
      patient.medical_history = medicalHistoryDraft;
    }
  };

  if (!patient) {
    return null;
  }

  const gender = patient.gender || 'Male';

  // Prepare patient vitals with ageMonths
  const patientVitals = vitalsHistory.map(v => ({
    ageMonths: patient.dob && v.recorded_at ? getAgeInMonths(patient.dob, v.recorded_at) : null,
    weight: v.weight,
    height: v.height
  })).filter(v => v.ageMonths != null);
  // If no history, use latest
  const latestVitals = patientVitals.length > 0 ? patientVitals[patientVitals.length - 1] : null;
  const weightData = getGrowthData(gender, patientVitals, 'weight');
  const heightData = getGrowthData(gender, patientVitals, 'height');

  // In the chart rendering section, use vitals.height and vitals.weight for the star marker:
  const starAgeMonths = patient.dob ? getAgeInMonths(patient.dob, selectedDate || new Date()) : null;
  const starWeight = vitals.weight ? parseFloat(vitals.weight) : null;
  const starHeight = vitals.height ? parseFloat(vitals.height) : null;

  // Add logging for star marker values
  console.log('Star Age (months):', starAgeMonths, 'Star Weight:', starWeight, 'Star Height:', starHeight);

  // Move these before the return statement:
  console.log('Scatter Weight Data:', { ageMonths: starAgeMonths, patient: starWeight });
  console.log('Scatter Height Data:', { ageMonths: starAgeMonths, patient: starHeight });

  // Helper to get age in months and find milestone group
  const now = selectedDate || new Date();
  const ageMonths = patient.dob ? getAgeInMonths(patient.dob, now) : null;
  function getMilestoneGroup(ageMonths) {
    if (ageMonths == null) return null;
    for (const group of milestonesData.milestones) {
      const [min, max] = group.ageRange.split('-').map(s => parseInt(s));
      if (ageMonths >= min && ageMonths <= max) return group;
    }
    return null;
  }
  const milestoneGroup = getMilestoneGroup(ageMonths);

  async function handleSendTelegramNote(note) {
    try {
      const response = await fetch('http://localhost:3001/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: patient.clinic_id,
          patientId: patient.id,
          message: `
👶 *Visit Note for ${patient.name}*

*Date:* ${note.visit_date}
*Doctor:* ${note.doctors?.users?.full_name || 'Unknown'}
*Chief Complaint:* ${note.chief_complaint || 'N/A'}
*Diagnosis:* ${note.diagnosis || 'N/A'}
*Treatment Plan:* ${note.treatment_plan?.medications || 'N/A'}
*Advice:* ${note.treatment_plan?.advice || 'N/A'}
          `
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Message sent to Telegram!');
      } else {
        alert('Failed to send: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to send: ' + err.message);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 dark:bg-gray-900">
      {/* Patient Info Header - Overhauled */}
      <div className="relative mb-8">
        <div className="bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6 border border-blue-200 dark:bg-none dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:border-gray-700">
          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white dark:border-gray-800">
              {patient.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : <User className="w-10 h-10" />}
            </div>
            <span className="mt-2 px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-xs font-semibold">{patient.gender || 'N/A'}</span>
          </div>
          {/* Info */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Name</p>
                  <p className="font-semibold text-lg text-gray-800 dark:text-gray-100">{patient.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Age</p>
                  <span className="inline-flex items-center gap-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{patient.age} years</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-200 text-green-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold">{patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A'}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Guardian</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{patient.guardian_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Guardian Phone</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{patient.guardian_phone}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {patient.delivery_type && (
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-300">Delivery Type</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {patient.delivery_type === 'normal' ? 'Normal Delivery' : 'C-Section'}
                    </p>
                  </div>
                </div>
              )}
              {patient.birth_term && (
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-300">Birth Term</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {patient.birth_term === 'full_term' && 'Full Term (37-42 weeks)'}
                      {patient.birth_term === 'premature' && 'Premature (<37 weeks)'}
                      {patient.birth_term === 'postmature' && 'Postmature (>42 weeks)'}
                      {patient.gestational_age_weeks && (
                        <span className="text-blue-600 ml-1">
                          ({patient.gestational_age_weeks} weeks)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Address</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{patient.address}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Modern Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white bg-opacity-80 hover:bg-red-100 text-red-500 rounded-full p-2 shadow transition-colors border border-red-200"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Growth Chart Section (production-ready, using JSON reference data) */}
      <div className="mb-8 flex flex-col md:flex-row gap-8">
        {/* Weight Chart */}
        <div className="flex-1">
          <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-lg p-6 h-full flex flex-col animate-fade-in">
            <div className="flex items-center mb-2 gap-2">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Weight Growth Chart ({gender === 'Female' ? 'Girls' : 'Boys'})</h3>
              <span className="ml-2 cursor-pointer group relative">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#1E40AF">i</text></svg>
                <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white text-xs text-gray-700 rounded-lg shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  This chart compares the patient's weight to WHO/CDC reference data for their gender and age.
                </span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageMonths" domain={[0, 24]} type="number" label={{ value: 'Age (months)', position: 'insideBottomRight', offset: -5 }} ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]} tick={{ fill: '#2563eb', fontWeight: 500 }} />
                <YAxis domain={[0, 16]} type="number" label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#059669', fontWeight: 500 }} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
                <Scatter
                  data={weightData}
                  dataKey="min"
                  name="Min Weight (kg)"
                  line={{ stroke: '#38bdf8', strokeWidth: 2 }}
                  lineType="joint"
                  fill="#38bdf8"
                  legendType="line"
                  shape="none"
                />
                <Scatter
                  data={weightData}
                  dataKey="avg"
                  name="Average Weight (kg)"
                  line={{ stroke: '#6366f1', strokeWidth: 2 }}
                  lineType="joint"
                  fill="#6366f1"
                  legendType="line"
                  shape="none"
                />
                <Scatter
                  data={weightData}
                  dataKey="max"
                  name="Max Weight (kg)"
                  line={{ stroke: '#22d3ee', strokeWidth: 2 }}
                  lineType="joint"
                  fill="#22d3ee"
                  legendType="line"
                  shape="none"
                />
                {starWeight !== null && starWeight !== undefined && starAgeMonths !== null && (
                  <Scatter
                    data={[{ ageMonths: starAgeMonths, patient: starWeight }]}
                    dataKey="patient"
                    fill="#ef4444"
                    name="Your Baby"
                    shape={StarShape}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Height Chart */}
        <div className="flex-1">
          <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-lg p-6 h-full flex flex-col animate-fade-in">
            <div className="flex items-center mb-2 gap-2">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Height Growth Chart ({gender === 'Female' ? 'Girls' : 'Boys'})</h3>
              <span className="ml-2 cursor-pointer group relative">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#059669">i</text></svg>
                <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white text-xs text-gray-700 rounded-lg shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  This chart compares the patient's height to WHO/CDC reference data for their gender and age.
                </span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageMonths" domain={[0, 24]} type="number" label={{ value: 'Age (months)', position: 'insideBottomRight', offset: -5 }} ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]} tick={{ fill: '#2563eb', fontWeight: 500 }} />
                <YAxis domain={[40, 100]} type="number" label={{ value: 'Height (cm)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#059669', fontWeight: 500 }} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
                <Scatter
                  data={heightData}
                  dataKey="min"
                  name="Min Height (cm)"
                  line={{ stroke: '#38bdf8', strokeWidth: 2 }}
                  lineType="joint"
                  fill="#38bdf8"
                  legendType="line"
                  shape="none"
                />
                <Scatter
                  data={heightData}
                  dataKey="avg"
                  name="Average Height (cm)"
                  line={{ stroke: '#6366f1', strokeWidth: 2 }}
                  lineType="joint"
                  fill="#6366f1"
                  legendType="line"
                  shape="none"
                />
                <Scatter
                  data={heightData}
                  dataKey="max"
                  name="Max Height (cm)"
                  line={{ stroke: '#22d3ee', strokeWidth: 2 }}
                  lineType="joint"
                  fill="#22d3ee"
                  legendType="line"
                  shape="none"
                />
                {starHeight !== null && starHeight !== undefined && starAgeMonths !== null && (
                  <Scatter
                    data={[{ ageMonths: starAgeMonths, patient: starHeight }]}
                    dataKey="patient"
                    fill="#ef4444"
                    name="Your Baby"
                    shape={StarShape}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Milestones Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-emerald-700 dark:text-emerald-200 flex items-center gap-2">
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v4m0 8v4m-4-4h8" /></svg>
          Developmental Milestones
        </h3>
        {milestoneGroup ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['cognitive', 'grossMotor', 'fineMotor', 'communicationSocial'].map(domain => {
              const domainIcons = {
                cognitive: <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 15s1.5-2 4-2 4 2 4 2" /></svg>,
                grossMotor: <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>,
                fineMotor: <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>,
                communicationSocial: <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M8 16h8" /></svg>,
              };
              return (
                <div key={domain} className="bg-gradient-to-br from-white via-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow p-4 flex flex-col gap-2 border-t-4 border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    {domainIcons[domain]}
                    <h4 className="font-semibold text-blue-700 dark:text-blue-200 text-base capitalize">{domain.replace(/([A-Z])/g, ' $1')}</h4>
                  </div>
                  <ul className="space-y-2">
                    {milestoneGroup[domain].map((item, idx) => {
                      const key = `${domain}-${idx}`;
                      const status = milestoneStatus[key] || { met: true, comment: '' };
                      return (
                        <li key={key} className="flex items-center gap-2 group">
                          <button
                            type="button"
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 focus:outline-none shadow-sm group-hover:scale-110 ${status.met ? 'border-green-400 bg-green-100' : 'border-rose-400 bg-rose-100'}`}
                            onClick={() => setMilestoneStatus(prev => ({ ...prev, [key]: { ...status, met: !status.met } }))}
                            title={status.met ? 'Met' : 'Not met'}
                          >
                            {status.met ? <Check className="w-4 h-4 text-green-600 transition-all duration-200" /> : <X className="w-4 h-4 text-rose-600 transition-all duration-200" />}
                          </button>
                          <span className="flex-1 text-gray-800 dark:text-gray-200 text-sm font-medium">{item}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.met ? 'bg-green-200 text-green-800' : 'bg-rose-200 text-rose-800'} transition-all duration-200`}>{status.met ? 'Met' : 'Not met'}</span>
                          {!status.met && (
                            <input
                              type="text"
                              className="ml-2 border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-rose-200"
                              placeholder="Add comment"
                              value={status.comment}
                              onChange={e => setMilestoneStatus(prev => ({ ...prev, [key]: { ...status, comment: e.target.value } }))}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-300">No milestones found for this age.</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">* Milestones are general guidelines. Individual development may vary.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8 justify-center">
        <button
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 shadow-sm border-2 focus:outline-none text-base ${activeTab === 'notes' ? 'bg-blue-500 text-white border-blue-500 scale-105' : 'bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
        <button
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 shadow-sm border-2 focus:outline-none text-base ${activeTab === 'vaccination' ? 'bg-emerald-500 text-white border-emerald-500 scale-105' : 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-gray-800'}`}
          onClick={() => setActiveTab('vaccination')}
        >
          Vaccination
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'notes' && (
        <div>
          {/* Medical History */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" />Medical History</h3>
              {canEditMedicalHistory && !editingMedicalHistory && (
                <button
                  className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-semibold shadow hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-blue-200 dark:border-gray-700"
                  onClick={() => setEditingMedicalHistory(true)}
                  title="Edit Medical History"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 17.25V21h3.75l11.06-11.06a2.121 2.121 0 00-3-3L3 17.25z" /></svg>
                  Edit
                </button>
              )}
              {canEditMedicalHistory && editingMedicalHistory && (
                <div className="flex gap-2">
                  <button
                    className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-200 font-semibold shadow hover:bg-emerald-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    onClick={handleSaveMedicalHistory}
                    title="Save Medical History"
                  >
                    <Check className="w-4 h-4" />Save
                  </button>
                  <button
                    className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gray-100 text-gray-700 dark:text-gray-200 font-semibold shadow hover:bg-gray-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => { setEditingMedicalHistory(false); setMedicalHistoryDraft(patient.medical_history || ''); }}
                    title="Cancel Edit"
                  >
                    <X className="w-4 h-4" />Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-blue-400 rounded-2xl p-6 shadow flex flex-col gap-2">
              {editingMedicalHistory ? (
                <textarea
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 bg-white/80 text-gray-800 dark:text-gray-200 shadow-sm"
                  value={medicalHistoryDraft}
                  onChange={e => setMedicalHistoryDraft(e.target.value)}
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-200 text-base font-medium min-h-[2.5rem]">{patient.medical_history || 'No medical history recorded.'}</p>
              )}
            </div>
          </div>

          {/* Add New Note */}
          <div className="mb-10">
            {followUpConfirmation && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-center font-semibold">
                {followUpConfirmation}
              </div>
            )}
            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-blue-400 rounded-2xl p-8 shadow mb-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-400" />Add Visit Note</h3>
              <form onSubmit={handleAddNote} className="space-y-8">
                {/* Visit Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />Visit Type</label>
                  <div className="flex space-x-4">
                    {['New', 'Follow-Up', 'Vaccination'].map((type) => (
                      <label key={type} className="inline-flex items-center">
                        <input
                          type="radio"
                          value={type}
                          checked={visitType === type}
                          onChange={(e) => setVisitType(e.target.value)}
                          className="form-radio h-4 w-4 text-blue-600 dark:text-blue-300"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-200">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Chief Complaint */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" />Chief Complaint <span className="text-gray-500 dark:text-gray-300">(Parent's or child's main concern)</span></label>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    rows="2"
                    placeholder="e.g., Fever since 2 days, Cough and cold, Routine check-up"
                  />
                </div>

                {/* Development */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><User className="w-4 h-4 text-emerald-400" />Development</label>
                  <div className="space-y-2 flex flex-row items-center gap-6">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="Normal"
                        checked={developmentStatus === 'Normal'}
                        onChange={(e) => setDevelopmentStatus(e.target.value)}
                        className="form-radio h-4 w-4 text-emerald-600 dark:text-emerald-300"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">Normal</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="Delay"
                        checked={developmentStatus === 'Delay'}
                        onChange={(e) => setDevelopmentStatus(e.target.value)}
                        className="form-radio h-4 w-4 text-rose-600"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">Delay</span>
                    </label>
                    {developmentStatus === 'Delay' && (
                      <input
                        type="text"
                        value={developmentDelayDetails}
                        onChange={(e) => setDevelopmentDelayDetails(e.target.value)}
                        className="ml-4 rounded-lg border-gray-300 shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        placeholder="Specify: speech/motor/cognitive"
                      />
                    )}
                  </div>
                </div>

                {/* Physical Exam */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-pink-400" />Physical Exam Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'general', label: 'General', options: ['Active', 'Dull'] },
                      { key: 'chest_lungs', label: 'Chest/Lungs', options: ['Clear', 'Congested'] },
                      { key: 'abdomen', label: 'Abdomen', options: ['Soft', 'Tender'] },
                      { key: 'skin', label: 'Skin', options: ['Normal', 'Rashes'] },
                      { key: 'ent', label: 'ENT', options: ['Normal', 'Infection'] }
                    ].map(({ key, label, options }) => (
                      <div key={key} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" />{label}</label>
                        <div className="flex space-x-4">
                          {options.map((option) => (
                            <label key={option} className="inline-flex items-center">
                              <input
                                type="radio"
                                name={key}
                                value={option}
                                checked={physicalExam[key] === option}
                                onChange={(e) => setPhysicalExam({ ...physicalExam, [key]: e.target.value })}
                                className="form-radio h-4 w-4 text-blue-600 dark:text-blue-300"
                              />
                              <span className="ml-2 text-gray-700 dark:text-gray-200">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" />Diagnosis <span className="text-gray-500 dark:text-gray-300">(e.g., Upper respiratory tract infection, Gastroenteritis)</span></label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                    placeholder="Enter diagnosis"
                  />
                </div>

                {/* Treatment Plan */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-400" />Treatment Plan</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Medications</label>
                      <textarea
                        value={treatmentPlan.medications}
                        onChange={(e) => setTreatmentPlan({ ...treatmentPlan, medications: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        rows="2"
                        placeholder="e.g., Paracetamol drops, Syrup XYZ"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Advice/Counseling</label>
                      <textarea
                        value={treatmentPlan.advice}
                        onChange={(e) => setTreatmentPlan({ ...treatmentPlan, advice: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        rows="2"
                        placeholder="e.g., Hydration, Light meals, Hygiene tips"
                      />
                    </div>
                  </div>
                </div>

                {/* Follow-up Section in Add Visit Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />Is follow-up required?</label>
                  <div className="flex items-center gap-6 mb-2">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="followup_required"
                        value="no"
                        checked={!followUpRequired}
                        onChange={() => setFollowUpRequired(false)}
                        className="form-radio h-4 w-4 text-blue-600 dark:text-blue-300"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">No</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="followup_required"
                        value="yes"
                        checked={followUpRequired}
                        onChange={() => {
                          setFollowUpRequired(true);
                          setShowAppointmentScheduler(true);
                        }}
                        className="form-radio h-4 w-4 text-blue-600 dark:text-blue-300"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">Yes</span>
                    </label>
                  </div>
                </div>

                {/* Vitals Section */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1"><Heart className="w-4 h-4 text-pink-400" />Height (cm)</label>
                    <input
                      type="number"
                      value={vitals.height}
                      onChange={(e) => handleVitalChange('height', e.target.value)}
                      className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 ${vitalWarnings.height ? 'border-red-500' : ''}`}
                      placeholder="Height"
                      step="0.1"
                    />
                    {vitalWarnings.height && (
                      <p className="text-red-500 text-xs mt-1">{vitalWarnings.height}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1"><Heart className="w-4 h-4 text-pink-400" />Weight (kg)</label>
                    <input
                      type="number"
                      value={vitals.weight}
                      onChange={(e) => handleVitalChange('weight', e.target.value)}
                      className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 ${vitalWarnings.weight ? 'border-red-500' : ''}`}
                      placeholder="Weight"
                      step="0.1"
                    />
                    {vitalWarnings.weight && (
                      <p className="text-red-500 text-xs mt-1">{vitalWarnings.weight}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-yellow-400" />Temperature (°F)</label>
                    <input
                      type="number"
                      value={vitals.temperature}
                      onChange={(e) => handleVitalChange('temperature', e.target.value)}
                      className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 ${vitalWarnings.temperature ? 'border-red-500' : ''}`}
                      placeholder="Temperature"
                      step="0.1"
                    />
                    {vitalWarnings.temperature && (
                      <p className="text-red-500 text-xs mt-1">{vitalWarnings.temperature}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1"><Heart className="w-4 h-4 text-pink-400" />Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={vitals.heartRate}
                      onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                      className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 ${vitalWarnings.heartRate ? 'border-red-500' : ''}`}
                      placeholder="Heart Rate"
                    />
                    {vitalWarnings.heartRate && (
                      <p className="text-red-500 text-xs mt-1">{vitalWarnings.heartRate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1"><Heart className="w-4 h-4 text-pink-400" />Blood Pressure</label>
                    <input
                      type="text"
                      value={vitals.bloodPressure}
                      onChange={(e) => handleVitalChange('bloodPressure', e.target.value)}
                      className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 ${vitalWarnings.bloodPressure ? 'border-red-500' : ''}`}
                      placeholder="e.g., 120/80"
                    />
                    {vitalWarnings.bloodPressure && (
                      <p className="text-red-500 text-xs mt-1">{vitalWarnings.bloodPressure}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1"><Heart className="w-4 h-4 text-pink-400" />Head Circumference (cm)</label>
                    <input
                      type="number"
                      value={vitals.headCircumference}
                      onChange={(e) => handleVitalChange('headCircumference', e.target.value)}
                      className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 ${vitalWarnings.headCircumference ? 'border-red-500' : ''}`}
                      placeholder="Head Circumference"
                      step="0.1"
                    />
                    {vitalWarnings.headCircumference && (
                      <p className="text-red-500 text-xs mt-1">{vitalWarnings.headCircumference}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm mt-2">
                    {error}
                  </div>
                )}

                {/* Floating Action Button for Add Note (mobile) */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2 px-8 rounded-full font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    Add Note
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Previous Notes */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />Previous Visit Notes
            </h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : notes.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-emerald-200 rounded-full opacity-60 z-0" />
                <div className="space-y-10 pl-12">
                  {notes.map((note, idx) => {
                    const borderColors = {
                      'New': 'border-blue-400',
                      'Follow-Up': 'border-emerald-400',
                      'Vaccination': 'border-yellow-400',
                    };
                    const expanded = expandedNotes[note.id] || false;
                    return (
                      <div key={note.id} className={`relative bg-white dark:bg-gray-900 border-l-8 ${borderColors[note.visit_type] || 'border-blue-200'} shadow-lg rounded-2xl p-6 transition-all duration-300 group animate-fade-in`}> 
                        <div className="absolute -left-7 top-6 w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white z-10">
                          {idx + 1}
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-200 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />{new Date(note.visit_date).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-300 font-medium flex items-center gap-2"><User className="w-4 h-4 text-blue-400" />Dr. {note.doctors?.users?.full_name || 'Unknown'}</p>
                          </div>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${note.visit_type === 'New' ? 'bg-blue-100 text-blue-800' : note.visit_type === 'Follow-Up' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {note.visit_type}
                          </span>
                        </div>
                        <button
                          className={`absolute top-6 right-6 inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold shadow transition-all duration-150 focus:outline-none focus:ring-2 ${expanded ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 focus:ring-emerald-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-300'}`}
                          onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !expanded }))}
                          title={expanded ? 'Collapse' : 'Expand'}
                        >
                          {expanded ? <><X className="w-4 h-4" />Collapse</> : <><Plus className="w-4 h-4" />Expand</>}
                        </button>
                        <div className={`transition-all duration-300 ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-[180px] overflow-hidden opacity-80'} relative`}> 
                          {/* Chief Complaint */}
                          {note.chief_complaint && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" />Chief Complaint</h4>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">{note.chief_complaint}</p>
                            </div>
                          )}
                          {/* Development */}
                          {note.development_status && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><User className="w-4 h-4 text-emerald-400" />Development</h4>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {note.development_status}
                                {note.development_status === 'Delay' && note.development_delay_details && (
                                  <span className="ml-2">({note.development_delay_details})</span>
                                )}
                              </p>
                            </div>
                          )}
                          {/* Physical Exam */}
                          {note.physical_exam && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Heart className="w-4 h-4 text-pink-400" />Physical Exam</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                {Object.entries(note.physical_exam).map(([key, value]) => (
                                  <div key={key} className="bg-gray-50 dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-300 capitalize">{key.replace('_', ' ')}</p>
                                    <p className="font-medium">{value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Diagnosis */}
                          {note.diagnosis && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" />Diagnosis</h4>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">{note.diagnosis}</p>
                            </div>
                          )}
                          {/* Treatment Plan */}
                          {note.treatment_plan && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-400" />Treatment Plan</h4>
                              <div className="space-y-2 mt-2">
                                {note.treatment_plan.medications && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Medications</p>
                                    <p className="text-gray-600 dark:text-gray-400">{note.treatment_plan.medications}</p>
                                  </div>
                                )}
                                {note.treatment_plan.advice && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Advice/Counseling</p>
                                    <p className="text-gray-600 dark:text-gray-400">{note.treatment_plan.advice}</p>
                                  </div>
                                )}
                                {note.treatment_plan.vaccines_given && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Vaccines Given</p>
                                    <p className="text-gray-600 dark:text-gray-400">{note.treatment_plan.vaccines_details}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Follow-up */}
                          {note.follow_up_date && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />Follow-up</h4>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Next Visit: {new Date(note.follow_up_date).toLocaleDateString()}
                                {note.follow_up_notes && <span className="ml-2">({note.follow_up_notes})</span>}
                              </p>
                            </div>
                          )}
                          {/* Show future appointment if exists for this note */}
                          {(() => {
                            // Find the first future appointment after this note's visit_date
                            const futureAppt = futureAppointments.find(
                              appt => new Date(appt.date) > new Date(note.visit_date)
                            );
                            if (futureAppt) {
                              return (
                                <div className="mt-3">
                                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-200 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />Follow-up</h4>
                                  <p className="text-blue-700 dark:text-blue-200 mt-1">
                                    Next Visit: {new Date(futureAppt.date).toLocaleDateString()} {futureAppt.notes && <span>({futureAppt.notes})</span>}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {/* Vitals */}
                          {note.visit_notes_vitals && note.visit_notes_vitals[0] && (
                            <div className="mt-4 border-t pt-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><Heart className="w-4 h-4 text-pink-400" />Vitals</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {note.visit_notes_vitals[0].height && (
                                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Height</p>
                                    <p className="font-medium">{note.visit_notes_vitals[0].height} cm</p>
                                  </div>
                                )}
                                {note.visit_notes_vitals[0].weight && (
                                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Weight</p>
                                    <p className="font-medium">{note.visit_notes_vitals[0].weight} kg</p>
                                  </div>
                                )}
                                {note.visit_notes_vitals[0].temperature && (
                                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Temperature</p>
                                    <p className="font-medium">{note.visit_notes_vitals[0].temperature}°F</p>
                                  </div>
                                )}
                                {note.visit_notes_vitals[0].heart_rate && (
                                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Heart Rate</p>
                                    <p className="font-medium">{note.visit_notes_vitals[0].heart_rate} bpm</p>
                                  </div>
                                )}
                                {note.visit_notes_vitals[0].blood_pressure && (
                                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Blood Pressure</p>
                                    <p className="font-medium">{note.visit_notes_vitals[0].blood_pressure}</p>
                                  </div>
                                )}
                                {note.visit_notes_vitals[0].head_circumference && (
                                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Head Circumference</p>
                                    <p className="font-medium">{note.visit_notes_vitals[0].head_circumference} cm</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Development Milestones */}
                          {note.development_milestones && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-200 flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" />Developmental Milestones</h4>
                              {(() => {
                                // Group by domain using milestonesData
                                const domains = ['cognitive', 'grossMotor', 'fineMotor', 'communicationSocial'];
                                return domains.map(domain => {
                                  const items = milestonesData.milestones.flatMap(mg => mg[domain] || []);
                                  const domainEntries = Object.entries(note.development_milestones).filter(([key]) => key.startsWith(domain));
                                  if (domainEntries.length === 0) return null;
                                  return (
                                    <div key={domain} className="mb-2">
                                      <div className="font-semibold text-blue-600 dark:text-blue-300 text-xs mb-1 flex items-center gap-2">{domain.replace(/([A-Z])/g, ' $1')}</div>
                                      <ul className="space-y-1">
                                        {domainEntries.map(([key, value]) => (
                                          <li key={key} className="flex items-center gap-2">
                                            <span className={`inline-block w-4 h-4 rounded-full ${value.met ? 'bg-green-400' : 'bg-rose-400'}`}></span>
                                            <span className="text-gray-800 dark:text-gray-200 text-xs">{(() => {
                                              // Try to get the label from the milestone JSON
                                              const idx = parseInt(key.split('-')[1], 10);
                                              return items[idx] || key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                            })()}</span>
                                            {!value.met && value.comment && (
                                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-300">Comment: {value.comment}</span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                          <button
                            className="mt-2 px-4 py-1 rounded-full bg-blue-500 text-white font-semibold shadow hover:bg-blue-600 transition"
                            onClick={() => handleSendTelegramNote(note)}
                          >
                            Send to Telegram
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-300 text-center py-4">No previous visit notes found.</p>
            )}
          </div>
        </div>
      )}
      {activeTab === 'vaccination' && (
        <div>
          <VaccinationTable
            patientId={patient.id}
            patientName={patient.name}
            patientAge={patient.age}
            guardianName={patient.guardian_name}
            patientDOB={patient.dob}
          />
        </div>
      )}

      {/* Appointment Scheduler Modal */}
      {showAppointmentScheduler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <AppointmentScheduler
              patient={patient}
              defaultDate={followUpDate}
              onClose={() => setShowAppointmentScheduler(false)}
              onAppointmentScheduled={(appointment) => {
                setShowAppointmentScheduler(false);
                setFollowUpConfirmation('Follow-up appointment scheduled successfully!');
                setTimeout(() => setFollowUpConfirmation(''), 4000);
                if (onAppointmentScheduled) onAppointmentScheduled(appointment);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails; 