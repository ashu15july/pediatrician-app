import { supabase } from '../lib/supabase';

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation) => {
  console.error(`Error ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message}`);
};

// Patient operations
export const getPatients = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, age, dob, gender, guardian_name, guardian_phone, guardian_email, address, blood_group, allergies, medical_history, created_at, last_visit, guardian_relationship, delivery_type, birth_term, gestational_age_weeks, clinic_id, telegram_chat_id')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch patients');
  }
};

export const getPatientById = async (id, clinicId) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, age, dob, gender, guardian_name, guardian_phone, guardian_email, address, blood_group, allergies, medical_history, created_at, last_visit, guardian_relationship, delivery_type, birth_term, gestational_age_weeks, clinic_id, telegram_chat_id')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch patient');
  }
};

export const addPatient = async (patientData, clinicId) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([{ ...patientData, clinic_id: clinicId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'create patient');
  }
};

export const updatePatient = async (id, updates, clinicId) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'update patient');
  }
};

export const deletePatient = async (id, clinicId) => {
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId);
    
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, 'delete patient');
  }
};

// Visit Notes operations
export const getVisitNotes = async (patientId, clinicId) => {
  try {
    const { data, error } = await supabase
      .from('visit_notes')
      .select(`
        *,
        doctor:users!visit_notes_user_id_fkey(id, full_name),
        visit_notes_vitals (*)
      `)
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId)
      .order('visit_date', { ascending: false });
    if (error) throw error;
    // ai_response is included by default in *
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch visit notes');
  }
};

// Get doctor user (validate user is a doctor in this clinic)
const getDoctorUser = async (userId, clinicId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('role', 'doctor')
    .eq('clinic_id', clinicId)
    .single();
  if (error || !user) throw new Error('Doctor user not found');
  return user;
};

export const addVisitNote = async (noteData) => {
  try {
    // Validate doctor user
    await getDoctorUser(noteData.user_id, noteData.clinic_id);
    // Insert visit note
    const { data: visitNote, error: visitNoteError } = await supabase
      .from('visit_notes')
      .insert([{
        patient_id: noteData.patient_id,
        user_id: noteData.user_id,
        clinic_id: noteData.clinic_id,
        visit_date: noteData.visit_date,
        visit_type: noteData.visit_type,
        chief_complaint: noteData.chief_complaint,
        development_status: noteData.development_status,
        development_delay_details: noteData.development_delay_details,
        physical_exam: noteData.physical_exam,
        diagnosis: noteData.diagnosis,
        treatment_plan: noteData.treatment_plan,
        follow_up_date: noteData.follow_up_date,
        follow_up_notes: noteData.follow_up_notes,
        development_milestones: noteData.development_milestones,
        ai_response: noteData.ai_response || null
      }])
      .select()
      .single();
    if (visitNoteError) throw visitNoteError;
    // Insert vitals if present
    if (noteData.vitals) {
      const { error: vitalsError } = await supabase
        .from('visit_notes_vitals')
        .insert([{
          visit_note_id: visitNote.id,
          height: noteData.vitals.height,
          weight: noteData.vitals.weight,
          temperature: noteData.vitals.temperature,
          heart_rate: noteData.vitals.heart_rate,
          blood_pressure: noteData.vitals.blood_pressure,
          head_circumference: noteData.vitals.head_circumference
        }]);
      if (vitalsError) throw vitalsError;
    }
    return visitNote;
  } catch (error) {
    handleSupabaseError(error, 'create visit note');
  }
};

export const updateVisitNote = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('visit_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'update visit note');
  }
};

export const deleteVisitNote = async (id) => {
  try {
    const { error } = await supabase
      .from('visit_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, 'delete visit note');
  }
};

// Prescription operations
export const getPrescriptions = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('prescribed_date', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch prescriptions');
  }
};

export const createPrescription = async (prescriptionData) => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert([prescriptionData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'create prescription');
  }
};

export const updatePrescription = async (id, prescriptionData) => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .update(prescriptionData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'update prescription');
  }
};

export const deletePrescription = async (id) => {
  try {
    const { error } = await supabase
      .from('prescriptions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'delete prescription');
  }
};

// Fetch all vaccinations for a patient
export const getVaccinations = async (patientId) => {
  const { data, error } = await supabase
    .from('vaccinations')
    .select('*')
    .eq('patient_id', patientId)
    .order('due_date', { ascending: true });
  if (error) {
    throw error;
  }
  return data;
};

// Add or update a vaccination record
export const upsertVaccination = async (vaccination) => {
  const { data, error } = await supabase
    .from('vaccinations')
    .upsert([vaccination], { onConflict: ['patient_id', 'age_label', 'vaccine'] })
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
}; 