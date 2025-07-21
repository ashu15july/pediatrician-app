import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, FileText, Calendar, User, Phone, MapPin, Heart, AlertTriangle, Check, Clock, Edit, Trash2, Activity, Syringe, ChevronUp, ChevronDown, Mail, MessageCircle } from 'lucide-react';
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

// Helper: Calculate age in years and months
function getAgeInYearsAndMonths(dob) {
  if (!dob) return { years: 0, months: 0 };
  const birthDate = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months };
}

// Helper: Calculate age in months (used for growth charts, vitals, etc.)
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
        strokeWidth="1"
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

// Helper to capitalize first letter
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Helper to map appointment type to user-friendly label
function getAppointmentTypeLabel(type) {
  switch ((type || '').toLowerCase()) {
    case 'checkup': return 'Check-up';
    case 'followup': return 'Follow-up';
    case 'emergency': return 'Emergency';
    case 'vaccination': return 'Vaccination';
    default: return type || 'N/A';
  }
}

// Move sendWhatsAppMessage to outside the PatientDetails component
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

// Helper to map legacy/invalid visit types to allowed values
const normalizeVisitType = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'checkup':
    case 'check-up':
    case 'new':
      return 'Check-up';
    case 'followup':
    case 'follow-up':
      return 'Follow-up';
    case 'emergency':
      return 'Emergency';
    case 'vaccination':
      return 'Vaccination';
    default:
      return 'Check-up'; // fallback
  }
};

const PatientDetails = ({ patient, selectedDate, onClose, onAppointmentScheduled, onUpdate, onDelete }) => {
  // Determine which permission function to use
  const { hasPermission: authHasPermission, currentUser: authUser } = useAuth();
  const { hasPermission: clinicHasPermission, currentUser: clinicUser } = useClinicAuth();
  const hasPermission = clinicUser ? clinicHasPermission : authHasPermission;
  const activeUser = clinicUser || authUser;
  const isSupportUser = activeUser?.role === 'support';
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitType, setVisitType] = useState('Check-up');
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
  const canEditMedicalHistory = hasPermission && activeUser?.role !== 'support';

  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpConfirmation, setFollowUpConfirmation] = useState('');

  const [futureAppointments, setFutureAppointments] = useState([]);

  const [vitalsHistory, setVitalsHistory] = useState([]);

  const [milestoneStatus, setMilestoneStatus] = useState({});

  const [expandedNotes, setExpandedNotes] = useState({});

  const { clinic } = useClinic();

  const [savingNote, setSavingNote] = useState(false);

  // 1. Add a collapsible state for the vitals section
  const [expandedVitals, setExpandedVitals] = useState(true);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Add state for AI response in the form
  const [aiDraft, setAiDraft] = useState('');
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftError, setAiDraftError] = useState(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailOption, setEmailOption] = useState('notes'); // 'notes', 'vaccination', or 'both'
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(null);
  const [emailError, setEmailError] = useState(null);

  // Add state for WhatsApp sending
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappSuccess, setWhatsappSuccess] = useState(null);
  const [whatsappError, setWhatsappError] = useState(null);

  // Helper to check if all required fields are filled
  const isNoteComplete = () => {
    return chiefComplaint && developmentStatus && physicalExam && diagnosis && treatmentPlan && vitals.height && vitals.weight && vitals.temperature && vitals.heartRate && vitals.bloodPressure && vitals.headCircumference;
  };

  const handleAIAssessmentDraft = async () => {
    setAiDraftLoading(true);
    setAiDraftError(null);
    try {
      // Build clinical context from current form state
      const now = selectedDate || new Date();
      const ageInMonths = patient.dob ? getAgeInMonths(patient.dob, now) : null;
      const clinical_context = {
        age_in_months: ageInMonths,
        gender: patient.gender || null,
        delivery_type: patient.delivery_type || null,
        birth_term: patient.birth_term || null,
        gestational_age_weeks: patient.gestational_age_weeks || null,
        chief_complaint: chiefComplaint || null,
        development_status: developmentStatus || null,
        development_delay_details: developmentStatus === 'Delay' ? developmentDelayDetails : null,
        physical_exam: physicalExam || null,
        vitals: vitals || null,
        development_milestones: milestoneStatus || null
      };
      const res = await fetch('/api/ai-doctor-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinical_context })
      });
      const data = await res.json();
      const hasDiagnosis = data && typeof data.diagnosis === 'string' && data.diagnosis.trim() !== '';
      const hasTreatment = data && typeof data.treatment_plan === 'string' && data.treatment_plan.trim() !== '';
      const hasFollowUp = data && Array.isArray(data.follow_up_questions) && data.follow_up_questions.length > 0;
      if (hasDiagnosis || hasTreatment || hasFollowUp) {
        setAiDraft(data);
        setAiDraftError(null);
      } else if (typeof data === 'string' && data.trim().length > 0) {
        setAiDraft(data);
        setAiDraftError(null);
      } else {
        setAiDraft('');
        setAiDraftError('No AI response received.');
      }
    } catch (err) {
      setAiDraftError('Failed to get AI feedback.');
      console.error('AI Assessment error:', err);
    } finally {
      setAiDraftLoading(false);
    }
  };

  const handleAIAssessment = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);
    try {
      // Use the latest visit note (or combine notes if needed)
      const latestNote = notes && notes.length > 0 ? notes[0] : null;
      if (!latestNote || !patient) {
        setAiError('No visit note or patient data available.');
        setAiLoading(false);
        return;
      }
      // Calculate age in months
      const now = selectedDate || new Date();
      const ageInMonths = patient.dob ? getAgeInMonths(patient.dob, now) : null;
      // Build HIPAA-compliant context
      const clinical_context = {
        age_in_months: ageInMonths,
        gender: patient.gender || null,
        delivery_type: patient.delivery_type || null,
        birth_term: patient.birth_term || null,
        gestational_age_weeks: patient.gestational_age_weeks || null,
        visit_type: latestNote.visit_type || null,
        chief_complaint: latestNote.chief_complaint || null,
        development_status: latestNote.development_status || null,
        development_delay_details: latestNote.development_delay_details || null,
        physical_exam: latestNote.physical_exam || null,
        diagnosis: latestNote.diagnosis || null,
        treatment_plan: latestNote.treatment_plan || null,
        vitals: latestNote.vitals || null,
        development_milestones: latestNote.development_milestones || null,
        follow_up_required: !!latestNote.follow_up_date,
        follow_up_notes: latestNote.follow_up_notes || null
      };
      const res = await fetch('/api/ai-doctor-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinical_context })
      });
      const data = await res.json();
      setAiResponse(data);
    } catch (err) {
      setAiError('Failed to get AI feedback.');
    } finally {
      setAiLoading(false);
    }
  };

  const loadNotes = useCallback(async () => {
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
  }, [patient?.id, clinic?.id]);

  useEffect(() => {
    if (patient?.id) {
      loadNotes();
    }
  }, [patient?.id, loadNotes]);

  useEffect(() => {
    if (patient?.id && selectedDate && activeUser?.role === 'doctor') {
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
  }, [patient?.id, patient?.appointment_id, selectedDate, activeUser?.role]);

  const fetchFutureAppointments = useCallback(async () => {
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
  }, [patient?.id]);

  useEffect(() => {
    fetchFutureAppointments();
  }, [fetchFutureAppointments]);

  const fetchVitalsHistory = useCallback(async () => {
    if (!patient?.id) return;
    const { data, error } = await supabase
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: true });
    if (!error && data) {
      setVitalsHistory(data);
    }
  }, [patient?.id]);

  useEffect(() => {
    fetchVitalsHistory();
  }, [fetchVitalsHistory]);

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
    setSavingNote(true);

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

    if (!activeUser?.id) {
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
        user_id: activeUser.id, // was doctor_id
        clinic_id: clinic?.id,
        visit_date: selectedDate.toLocaleDateString('en-CA'),
        visit_type: normalizeVisitType(visitType),
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
        ai_response: aiDraft || null,
      };

      if (followUpRequired && followUpDate) {
        noteData.follow_up_date = followUpDate;
        noteData.follow_up_notes = followUpNotes;
      }

      await addVisitNote(noteData);
      
      // Debug log for appointment_id
      console.log('handleAddNote: patient.appointment_id =', patient.appointment_id);
      // Update appointment status to 'completed' if there's an appointment_id
      if (patient.appointment_id) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', patient.appointment_id);
        
        if (appointmentError) {
          console.error('Error updating appointment status:', appointmentError);
        }
      }
      
      // Auto-create follow-up appointment if followUpDate is filled
      if (followUpDate) {
        const { error: apptError } = await supabase.from('appointments').insert([
          {
            patient_id: patient.id,
            doctor_id: activeUser.id,
            date: followUpDate,
            time: '09:00', // default time, can be changed
            status: 'scheduled',
            type: 'followup',
            reason: 'Follow-up',
            notes: followUpNotes || null,
            created_by: activeUser.id,
            created_at: new Date().toISOString()
          }
        ]);
        // Optionally handle apptError
        // Send appointment confirmation email if patient has email
        console.log('PatientDetails follow-up patient:', patient);
        console.log('PatientDetails follow-up patient.guardian_email:', patient.guardian_email);
        if (patient.guardian_email) {
          try {
            console.log('Sending appointment confirmation email to:', patient.guardian_email);
            const response = await fetch('/api/send-appointment-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientEmail: patient.guardian_email,
                patientName: patient.name,
                appointmentDate: followUpDate,
                appointmentTime: '09:00',
                doctorName: activeUser.full_name || '',
                clinicName: clinic?.name || '',
                clinicAddress: clinic?.address || '',
                clinicPhone: clinic?.phone || '',
                notes: followUpNotes || ''
              })
            });
            const responseBody = await response.json().catch(() => ({}));
            console.log('Appointment confirmation email response:', response.status, responseBody);
          } catch (err) {
            console.error('Failed to send appointment confirmation email:', err);
          }
        }
      }
      
      // Reset all form fields
      setNewNote('');
      setVisitType('Check-up');
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
      
      // Refresh appointments to show updated status and new follow-up
      if (onAppointmentScheduled) {
        await onAppointmentScheduled();
      }
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note. Please try again.');
    } finally {
      setSavingNote(false);
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

  // Helper to generate email HTML for notes
  const generateNotesHtml = () => {
    if (!notes.length) return '<p>No visit notes available.</p>';
    return notes.map(note => `
      <div style="margin-bottom:24px;">
        <h3 style="color:#2563eb;">Visit Note (${note.visit_type}) - ${new Date(note.visit_date).toLocaleDateString()}</h3>
        <p><b>Doctor:</b> ${note.doctor?.full_name || 'Unknown'}</p>
        <p><b>Chief Complaint:</b> ${note.chief_complaint || 'N/A'}</p>
        <p><b>Diagnosis:</b> ${note.diagnosis || 'N/A'}</p>
        <p><b>Treatment Plan:</b> ${note.treatment_plan?.medications || 'N/A'}<br/>${note.treatment_plan?.advice || ''}</p>
        <p><b>Advice:</b> ${note.treatment_plan?.advice || 'N/A'}</p>
        <p><b>Follow-up:</b> ${note.follow_up_date ? new Date(note.follow_up_date).toLocaleDateString() : 'N/A'}</p>
      </div>
    `).join('');
  };
  // Helper to generate email HTML for vaccination
  const generateVaccinationHtml = () => {
    // For simplicity, just mention that vaccination details are attached or available in the app
    return `<div><h3 style='color:#059669;'>Vaccination Details</h3><p>Vaccination details for ${patient.name} are available in the app or can be provided as a summary here.</p></div>`;
  };
  // Compose email content based on option
  useEffect(() => {
    let subject = `Patient Details for ${patient.name}`;
    let html = '';
    if (emailOption === 'notes') {
      subject = `Visit Notes for ${patient.name}`;
      html = generateNotesHtml();
    } else if (emailOption === 'vaccination') {
      subject = `Vaccination Details for ${patient.name}`;
      html = generateVaccinationHtml();
    } else {
      subject = `Visit Notes & Vaccination Details for ${patient.name}`;
      html = generateNotesHtml() + generateVaccinationHtml();
    }
    setEmailSubject(subject);
  }, [emailOption, notes, patient]);

  // Send email handler
  const handleSendEmail = async () => {
    setEmailSending(true);
    setEmailSuccess(null);
    setEmailError(null);
    try {
      // Use environment variable or fallback to dynamic URL
      const baseUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : window.location.origin);
      const res = await fetch(`${baseUrl}/api/send-patient-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          email: patient.guardian_email,
          subject: emailSubject,
          emailOption
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSuccess('Email sent successfully!');
        setShowEmailModal(false);
      } else {
        setEmailError(data.error || 'Failed to send email');
      }
    } catch (err) {
      setEmailError(err.message || 'Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  // Fetch appointment type if appointment_id is present
  useEffect(() => {
    const fetchAppointmentType = async () => {
      if (patient?.appointment_id) {
        const { data, error } = await supabase
          .from('appointments')
          .select('type')
          .eq('id', patient.appointment_id)
          .single();
        if (!error && data && data.type) {
          setVisitType(data.type);
        } else {
          setVisitType('Check-up'); // fallback
        }
      } else {
        setVisitType('Check-up');
      }
    };
    fetchAppointmentType();
  }, [patient?.appointment_id]);

  // Send WhatsApp handler
  const handleSendWhatsApp = async () => {
    setWhatsappSending(true);
    setWhatsappSuccess(null);
    setWhatsappError(null);
    try {
      const baseUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : window.location.origin);
      const res = await fetch(`${baseUrl}/api/send-patient-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          whatsapp: patient.guardian_phone,
          subject: emailSubject,
          emailOption // reuse for PDF content selection
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsappSuccess('WhatsApp message sent successfully!');
      } else {
        setWhatsappError(data.error || 'Failed to send WhatsApp message');
      }
    } catch (err) {
      setWhatsappError(err.message || 'Failed to send WhatsApp message');
    } finally {
      setWhatsappSending(false);
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
*Doctor:* ${note.doctor?.full_name || 'Unknown'}
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
                    {/* Age display logic */}
                    {(() => {
                      const { years, months } = getAgeInYearsAndMonths(patient.dob);
                      if (years < 1) {
                        return <span className="font-semibold text-gray-800 dark:text-gray-100">{months} month{months !== 1 ? 's' : ''}</span>;
                      } else {
                        return <span className="font-semibold text-gray-800 dark:text-gray-100">{years} year{years !== 1 ? 's' : ''}{months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''}</span>;
                      }
                    })()}
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
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Address</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{patient.address || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Blood Group</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{patient.blood_group || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Guardian Email</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{patient.guardian_email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Delivery Type</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    {patient.delivery_type
                      ? capitalize(patient.delivery_type.replace(/_/g, ' '))
                      : <span className="text-gray-400">Not recorded</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Birth Term</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    {patient.birth_term
                      ? capitalize(patient.birth_term.replace(/_/g, ' '))
                      : <span className="text-gray-400">Not recorded</span>}
                    {patient.gestational_age_weeks && (
                      <span className="text-blue-600 ml-1">
                        ({patient.gestational_age_weeks} weeks)
                      </span>
                    )}
                  </p>
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
            
            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-blue-400 rounded-2xl p-8 shadow mb-6">
              <h3 className="text-2xl font-bold mb-8 text-blue-800 dark:text-blue-200 flex items-center gap-2"><Plus className="w-6 h-6 text-blue-400" />Add Visit Note</h3>
              <form onSubmit={handleAddNote} className="space-y-8">
                {/* Two-column row: Visit Type (left), Medical History (right) */}
                <div className="flex flex-col md:flex-row gap-6 mb-2">
                  {/* Visit Type Card */}
                  <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
                    <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />Visit Type
                    </label>
                    <select
                      className="text-lg font-bold text-gray-800 dark:text-gray-100 rounded-lg border border-blue-200 px-4 py-2"
                      value={visitType}
                      onChange={e => setVisitType(e.target.value)}
                    >
                      <option value="Check-up">Check-up</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Vaccination">Vaccination</option>
                    </select>
                  </div>
                  {/* Medical History Card (with edit button for doctor/admin) */}
                  <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-lg font-semibold text-blue-700 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />Medical History
                      </label>
                      {canEditMedicalHistory && !editingMedicalHistory && (
                        <button
                          className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-semibold shadow hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-blue-200 dark:border-gray-700"
                          onClick={() => setEditingMedicalHistory(true)}
                          type="button"
                          title="Edit Medical History"
                        >
                          <Edit className="w-4 h-4" />Edit
                        </button>
                      )}
                      {canEditMedicalHistory && editingMedicalHistory && (
                        <div className="flex gap-2">
                          <button
                            className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-200 font-semibold shadow hover:bg-emerald-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            onClick={handleSaveMedicalHistory}
                            type="button"
                            title="Save Medical History"
                          >
                            <Check className="w-4 h-4" />Save
                          </button>
                          <button
                            className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gray-100 text-gray-700 dark:text-gray-200 font-semibold shadow hover:bg-gray-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            onClick={() => { setEditingMedicalHistory(false); setMedicalHistoryDraft(patient.medical_history || ''); }}
                            type="button"
                            title="Cancel Edit"
                          >
                            <X className="w-4 h-4" />Cancel
                          </button>
                        </div>
                      )}
                    </div>
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

                {/* Vitals Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-lg font-bold text-pink-700 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-400" />Vitals
                    </label>
                    <button
                      className="flex items-center gap-1 text-pink-700 hover:text-pink-900 focus:outline-none focus:ring-2 focus:ring-pink-300 rounded px-2 py-1"
                      onClick={() => setExpandedVitals(v => !v)}
                      aria-expanded={expandedVitals}
                      type="button"
                    >
                      {expandedVitals ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ${expandedVitals ? 'max-h-[2000px] py-2' : 'max-h-0 py-0'}`} style={{ transitionProperty: 'max-height, padding' }}>
                    {expandedVitals && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 flex items-center gap-1"><Heart className="w-5 h-5 text-pink-400" />Height (cm)</label>
                          <input
                            type="number"
                            value={vitals.height}
                            onChange={(e) => handleVitalChange('height', e.target.value)}
                            className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-base p-2 ${vitalWarnings.height ? 'border-red-500' : ''}`}
                            placeholder="Height"
                            step="0.1"
                          />
                          <p className="text-xs text-gray-500 mt-1">Range: 45-120 cm</p>
                          {vitalWarnings.height && (
                            <p className="text-red-500 text-xs mt-1">{vitalWarnings.height}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 flex items-center gap-1"><Heart className="w-5 h-5 text-pink-400" />Weight (kg)</label>
                          <input
                            type="number"
                            value={vitals.weight}
                            onChange={(e) => handleVitalChange('weight', e.target.value)}
                            className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-base p-2 ${vitalWarnings.weight ? 'border-red-500' : ''}`}
                            placeholder="Weight"
                            step="0.1"
                          />
                          <p className="text-xs text-gray-500 mt-1">Range: 2-40 kg</p>
                          {vitalWarnings.weight && (
                            <p className="text-red-500 text-xs mt-1">{vitalWarnings.weight}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-yellow-400" />Temperature (°F)</label>
                          <input
                            type="number"
                            value={vitals.temperature}
                            onChange={(e) => handleVitalChange('temperature', e.target.value)}
                            className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 text-base p-2 ${vitalWarnings.temperature ? 'border-red-500' : ''}`}
                            placeholder="Temperature"
                            step="0.1"
                          />
                          <p className="text-xs text-gray-500 mt-1">Range: 97-100.4 °F</p>
                          {vitalWarnings.temperature && (
                            <p className="text-red-500 text-xs mt-1">{vitalWarnings.temperature}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 flex items-center gap-1"><Heart className="w-5 h-5 text-pink-400" />Heart Rate (bpm)</label>
                          <input
                            type="number"
                            value={vitals.heartRate}
                            onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                            className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-base p-2 ${vitalWarnings.heartRate ? 'border-red-500' : ''}`}
                            placeholder="Heart Rate"
                          />
                          <p className="text-xs text-gray-500 mt-1">Range: 80-160 bpm</p>
                          {vitalWarnings.heartRate && (
                            <p className="text-red-500 text-xs mt-1">{vitalWarnings.heartRate}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 flex items-center gap-1"><Heart className="w-5 h-5 text-pink-400" />Blood Pressure</label>
                          <input
                            type="text"
                            value={vitals.bloodPressure}
                            onChange={(e) => handleVitalChange('bloodPressure', e.target.value)}
                            className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-base p-2 ${vitalWarnings.bloodPressure ? 'border-red-500' : ''}`}
                            placeholder="e.g., 90/60"
                          />
                          <p className="text-xs text-gray-500 mt-1">Range: 80/50 - 120/80 mmHg</p>
                          {vitalWarnings.bloodPressure && (
                            <p className="text-red-500 text-xs mt-1">{vitalWarnings.bloodPressure}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 flex items-center gap-1"><Heart className="w-5 h-5 text-pink-400" />Head Circumference (cm)</label>
                          <input
                            type="number"
                            value={vitals.headCircumference}
                            onChange={(e) => handleVitalChange('headCircumference', e.target.value)}
                            className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-base p-2 ${vitalWarnings.headCircumference ? 'border-red-500' : ''}`}
                            placeholder="Head Circumference"
                            step="0.1"
                          />
                          <p className="text-xs text-gray-500 mt-1">Range: 32-52 cm</p>
                          {vitalWarnings.headCircumference && (
                            <p className="text-red-500 text-xs mt-1">{vitalWarnings.headCircumference}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              

                {/* Chief Complaint */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-400" />Chief Complaint <span className="text-gray-500 dark:text-gray-300 text-base font-normal">(Parent's or child's main concern)</span></label>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base p-3"
                    rows="2"
                    placeholder="e.g., Fever since 2 days, Cough and cold, Routine check-up"
                  />
                </div>

                {/* Development */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><User className="w-5 h-5 text-emerald-400" />Development</label>
                  <div className="space-y-2 flex flex-row items-center gap-6">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="Normal"
                        checked={developmentStatus === 'Normal'}
                        onChange={(e) => setDevelopmentStatus(e.target.value)}
                        className="form-radio h-5 w-5 text-emerald-600 dark:text-emerald-300"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200 text-base">Normal</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="Delay"
                        checked={developmentStatus === 'Delay'}
                        onChange={(e) => setDevelopmentStatus(e.target.value)}
                        className="form-radio h-5 w-5 text-rose-600"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200 text-base">Delay</span>
                    </label>
                    {developmentStatus === 'Delay' && (
                      <input
                        type="text"
                        value={developmentDelayDetails}
                        onChange={(e) => setDevelopmentDelayDetails(e.target.value)}
                        className="ml-4 rounded-lg border-gray-300 shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-base p-2"
                        placeholder="Specify: speech/motor/cognitive"
                      />
                    )}
                  </div>
                </div>

                {/* Physical Exam */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-2">
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Heart className="w-5 h-5 text-pink-400" />Physical Exam Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { key: 'general', label: 'General', options: ['Active', 'Dull'] },
                      { key: 'chest_lungs', label: 'Chest/Lungs', options: ['Clear', 'Congested'] },
                      { key: 'abdomen', label: 'Abdomen', options: ['Soft', 'Tender'] },
                      { key: 'skin', label: 'Skin', options: ['Normal', 'Rashes'] },
                      { key: 'ent', label: 'ENT', options: ['Normal', 'Infection'] }
                    ].map(({ key, label, options }) => (
                      <div key={key} className="space-y-2">
                        <label className="block text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" />{label}</label>
                        <div className="flex space-x-6">
                          {options.map((option) => (
                            <label key={option} className="inline-flex items-center">
                              <input
                                type="radio"
                                name={key}
                                value={option}
                                checked={physicalExam[key] === option}
                                onChange={(e) => setPhysicalExam({ ...physicalExam, [key]: e.target.value })}
                                className="form-radio h-5 w-5 text-blue-600 dark:text-blue-300"
                              />
                              <span className="ml-2 text-gray-700 dark:text-gray-200 text-base">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Move AI Assessment button and output here, above Diagnosis */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4 mb-4">
                  <button
                    type="button"
                    onClick={handleAIAssessmentDraft}
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold py-3 px-8 rounded-full shadow-lg text-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all duration-200 disabled:opacity-60 mb-2"
                    disabled={aiDraftLoading}
                  >
                    {aiDraftLoading ? 'Getting AI Assessment...' : 'AI Assessment'}
                  </button>
                  {aiDraftError && <p className="text-red-500 text-sm">{aiDraftError}</p>}
                </div>
                {/* Show AI Assessment output only if result is available and has content */}
                {aiDraft && (() => {
                  let parsedAIDraft = aiDraft;
                  if (typeof aiDraft === 'string') {
                    try {
                      parsedAIDraft = JSON.parse(aiDraft);
                    } catch {
                      parsedAIDraft = { diagnosis: aiDraft };
                    }
                  }
                  // Only show if at least one field is non-empty
                  const hasContent =
                    (parsedAIDraft.diagnosis && parsedAIDraft.diagnosis.trim() !== '') ||
                    (parsedAIDraft.treatment_plan && parsedAIDraft.treatment_plan.trim() !== '') ||
                    (parsedAIDraft.follow_up_questions && Array.isArray(parsedAIDraft.follow_up_questions) && parsedAIDraft.follow_up_questions.length > 0) ||
                    (parsedAIDraft.advice_counselling && parsedAIDraft.advice_counselling.trim() !== '');

                  if (!hasContent) return null;

                  return (
                    <div className="w-full bg-emerald-50 dark:bg-gray-800 border-l-4 border-emerald-400 rounded-lg p-4 mt-2 text-gray-800 dark:text-gray-100 whitespace-pre-line">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-200">AI Assessment:</span>
                      <div className="mt-2">
                        {parsedAIDraft.diagnosis && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-blue-700 dark:text-blue-200 mb-1">Diagnosis</h4>
                            <p>{parsedAIDraft.diagnosis}</p>
                          </div>
                        )}
                        {parsedAIDraft.treatment_plan && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-green-700 dark:text-green-200 mb-1">Treatment Plan</h4>
                            <p>{parsedAIDraft.treatment_plan}</p>
                          </div>
                        )}
                        {parsedAIDraft.follow_up_questions && parsedAIDraft.follow_up_questions.length > 0 && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-1">Follow-up Questions</h4>
                            <ul className="list-disc ml-6">
                              {parsedAIDraft.follow_up_questions.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          </div>
                        )}
                        {parsedAIDraft.advice_counselling && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-emerald-700 dark:text-emerald-200 mb-1">Advice / Counselling</h4>
                            <p>{parsedAIDraft.advice_counselling}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Diagnosis */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" />Diagnosis <span className="text-gray-500 dark:text-gray-300 text-base font-normal">(e.g., Upper respiratory tract infection, Gastroenteritis)</span></label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 text-base p-3"
                    placeholder="Enter diagnosis"
                  />
                </div>

                {/* Treatment Plan */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-2">
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-400" />Treatment Plan</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">Medications</label>
                      <textarea
                        value={treatmentPlan.medications}
                        onChange={(e) => setTreatmentPlan({ ...treatmentPlan, medications: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-base p-3"
                        rows="2"
                        placeholder="e.g., Paracetamol drops, Syrup XYZ"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2">Advice/Counseling</label>
                      <textarea
                        value={treatmentPlan.advice}
                        onChange={(e) => setTreatmentPlan({ ...treatmentPlan, advice: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-base p-3"
                        rows="2"
                        placeholder="e.g., Hydration, Light meals, Hygiene tips"
                      />
                    </div>
                  </div>
                </div>

                {/* Follow-up Section in Add Visit Note */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-400" />Is follow-up required?</label>
                  <div className="flex items-center gap-8 mb-2">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="followup_required"
                        value="no"
                        checked={!followUpRequired}
                        onChange={() => setFollowUpRequired(false)}
                        className="form-radio h-5 w-5 text-blue-600 dark:text-blue-300"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200 text-base">No</span>
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
                        className="form-radio h-5 w-5 text-blue-600 dark:text-blue-300"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200 text-base">Yes</span>
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200"
                    disabled={savingNote}
                  >
                    {savingNote ? 'Saving...' : 'Save Visit Note'}
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
                            <p className="text-sm text-gray-500 dark:text-gray-300 font-medium flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-400" />
                              {note.doctor?.full_name
                                ? (note.doctor.full_name.trim().toLowerCase().startsWith('dr')
                                    ? note.doctor.full_name
                                    : `Dr. ${note.doctor.full_name}`)
                                : 'Unknown'}
                            </p>
                          </div>
                          {/* Removed visit status pill */}
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
                          {/* Removed Send to Telegram and WhatsApp buttons */}
                          {note.ai_response && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">AI Assessment</h4>
                              <p className="text-gray-800 whitespace-pre-line bg-blue-50 rounded p-2 border border-blue-200 mt-1">{note.ai_response}</p>
                            </div>
                          )}
                          {/* Inside the previous visit notes rendering, after vitals and before follow-up ... */}
                          {(() => {
                            // Always show all milestones for each domain
                            const domains = ['cognitive', 'grossMotor', 'fineMotor', 'communicationSocial'];
                            // Get the patient's age in months for age-appropriate milestones
                            const ageMonths = patient.dob && note.visit_date ? getAgeInMonths(patient.dob, note.visit_date) : null;
                            // Find the closest milestone group for the age
                            const milestoneGroup = ageMonths !== null && milestonesData.milestones.length > 0
                              ? milestonesData.milestones.reduce((closest, mg) => {
                                  // Use ageRange string to get lower bound for comparison
                                  const mgAge = parseInt((mg.ageRange || '').split('-')[0], 10);
                                  if (!isNaN(mgAge) && mgAge <= ageMonths && (!closest || mgAge > parseInt((closest.ageRange || '').split('-')[0], 10))) {
                                    return mg;
                                  }
                                  return closest;
                                }, null)
                              : milestonesData.milestones[0];
                            return (
                              <div className="mt-3">
                                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-200 flex items-center gap-2 mb-2"><Check className="w-4 h-4 text-blue-400" />Developmental Milestones</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {domains.map(domain => {
                                    const items = (milestoneGroup && milestoneGroup[domain]) || [];
                                    return (
                                      <div key={domain} className="bg-blue-50 dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                                        <div className="font-semibold text-blue-600 dark:text-blue-300 text-xs mb-2 flex items-center gap-2 uppercase tracking-wide">{domain.replace(/([A-Z])/g, ' $1')}</div>
                                        <ul className="space-y-1">
                                          {items.map((label, idx) => {
                                            // Try to get the status from note.development_milestones, else default to met: true
                                            const key = `${domain}-${idx}`;
                                            const value = note.development_milestones && note.development_milestones[key] ? note.development_milestones[key] : { met: true, comment: '' };
                                            return (
                                              <li key={key} className="flex items-center gap-2 text-xs py-1">
                                                <span className={`inline-block w-3 h-3 rounded-full ${value.met ? 'bg-green-400' : 'bg-rose-400'}`}></span>
                                                <span className="text-gray-800 dark:text-gray-200 flex-1">{label}</span>
                                                <span className={`ml-2 ${value.met ? 'text-green-700' : 'text-rose-700'}`}>{value.met ? 'Met' : 'Not met'}</span>
                                                {!value.met && value.comment && (
                                                  <span className="ml-2 text-gray-500 dark:text-gray-300">({value.comment})</span>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <AppointmentScheduler
              patient={patient}
              defaultDate={followUpDate}
              onClose={() => setShowAppointmentScheduler(false)}
              onAppointmentScheduled={(appointment) => {
                setShowAppointmentScheduler(false);
                setFollowUpDate(appointment.date); // <-- Set the follow-up date in your form state
                setFollowUpConfirmation('Follow-up appointment scheduled successfully!');
                setTimeout(() => setFollowUpConfirmation(''), 4000);
                if (onAppointmentScheduled) onAppointmentScheduled(appointment);
              }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          onClick={() => {
            // Email validation logic
            const email = patient.guardian_email;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
              alert('Email is not configured for this user');
              return;
            }
            setEmailSuccess(null);
            setEmailError(null);
            setShowEmailModal(true);
          }}
          title={patient.guardian_email ? 'Send email to guardian' : 'No guardian email available'}
        >
          <Mail className="w-5 h-5" />
          Send Email
        </button>
        
      </div>
      {whatsappError && <div className="text-red-600 mb-2">{whatsappError}</div>}
      {whatsappSuccess && <div className="text-green-600 mb-2">{whatsappSuccess}</div>}
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setShowEmailModal(false)}><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-200">Send Email to Guardian</h2>
            <div className="mb-4">
              <label className="block font-medium mb-2">Choose what to send:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" name="emailOption" value="notes" checked={emailOption === 'notes'} onChange={() => setEmailOption('notes')} />
                  Visit Notes
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="emailOption" value="vaccination" checked={emailOption === 'vaccination'} onChange={() => setEmailOption('vaccination')} />
                  Vaccination Details
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="emailOption" value="both" checked={emailOption === 'both'} onChange={() => setEmailOption('both')} />
                  Both
                </label>
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-2">Email Subject:</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            </div>
            {emailError && <div className="text-red-600 mb-2">{emailError}</div>}
            {emailSuccess && <div className="text-green-600 mb-2">{emailSuccess}</div>}
            <button
              className="w-full py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
              onClick={handleSendEmail}
              disabled={emailSending}
            >
              {emailSending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails; 