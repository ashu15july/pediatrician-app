import { supabase } from '../lib/supabase';

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation) => {
  console.error(`Supabase error during ${operation}:`, error);
  
  // Handle specific error types
  if (error.message.includes('numeric field overflow')) {
    throw new Error(`Data validation error: One or more numeric values are too large for the database field. Please check your inputs.`);
  } else if (error.message.includes('foreign key')) {
    throw new Error(`Reference error: One or more referenced records do not exist.`);
  } else if (error.message.includes('duplicate key')) {
    throw new Error(`Duplicate record: This record already exists.`);
  } else {
    throw new Error(`Failed to ${operation}: ${error.message}`);
  }
};

// Patient operations
export const getPatients = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, patient_id, name, age, dob, gender, guardian_name, guardian_phone, guardian_email, address, blood_group, allergies, medical_history, created_at, last_visit, guardian_relationship, delivery_type, birth_term, gestational_age_weeks, clinic_id, telegram_chat_id')
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
    
    // Debug logging
    console.log('Adding visit note with data:', {
      patient_id: noteData.patient_id,
      user_id: noteData.user_id,
      clinic_id: noteData.clinic_id,
      vitals: noteData.vitals
    });
    
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
      // Ensure all numeric values are properly formatted and within reasonable limits
      const vitalsData = {
        visit_note_id: visitNote.id,
        height: noteData.vitals.height && !isNaN(parseFloat(noteData.vitals.height)) ? Number(parseFloat(noteData.vitals.height).toFixed(2)) : null,
        weight: noteData.vitals.weight && !isNaN(parseFloat(noteData.vitals.weight)) ? Number(parseFloat(noteData.vitals.weight).toFixed(2)) : null,
        temperature: noteData.vitals.temperature && !isNaN(parseFloat(noteData.vitals.temperature)) ? Number(parseFloat(noteData.vitals.temperature).toFixed(1)) : null,
        heart_rate: noteData.vitals.heart_rate && !isNaN(parseInt(noteData.vitals.heart_rate)) ? parseInt(noteData.vitals.heart_rate) : null,
        blood_pressure: noteData.vitals.blood_pressure || null,
        head_circumference: noteData.vitals.head_circumference && !isNaN(parseFloat(noteData.vitals.head_circumference)) ? Number(parseFloat(noteData.vitals.head_circumference).toFixed(1)) : null
      };

      // Special handling for temperature to ensure it meets database constraints
      if (vitalsData.temperature !== null) {
        // Database field now supports NUMERIC(5,2) which means max value is 999.99
        // Ensure temperature is within the medical range (90-120°F)
        if (vitalsData.temperature < 90) {
          vitalsData.temperature = 90.0; // Set to minimum valid temperature
          console.warn('Temperature adjusted to minimum valid value (90°F)');
        } else if (vitalsData.temperature > 120) {
          vitalsData.temperature = 120.0; // Set to maximum valid temperature
          console.warn('Temperature adjusted to maximum valid value (120°F)');
        }
      }

      // Debug logging for vitals
      console.log('Vitals data being inserted:', vitalsData);
      console.log('Vitals data types:', {
        height: typeof vitalsData.height,
        weight: typeof vitalsData.weight,
        temperature: typeof vitalsData.temperature,
        heart_rate: typeof vitalsData.heart_rate,
        blood_pressure: typeof vitalsData.blood_pressure,
        head_circumference: typeof vitalsData.head_circumference
      });

      // Validate numeric ranges before inserting
      if (vitalsData.height && vitalsData.height <= 0) {
        throw new Error('Height must be greater than 0 cm');
      }
      if (vitalsData.weight && vitalsData.weight <= 0) {
        throw new Error('Weight must be greater than 0 kg');
      }
      // Temperature constraint: database field now supports NUMERIC(5,2) with medical range 90-120°F
      if (vitalsData.temperature && (vitalsData.temperature < 90 || vitalsData.temperature > 120)) {
        throw new Error('Temperature value out of range (90-120°F)');
      }
      if (vitalsData.heart_rate && (vitalsData.heart_rate < 0 || vitalsData.heart_rate > 250)) {
        throw new Error('Heart rate value out of range (0-250 bpm)');
      }
      if (vitalsData.head_circumference && (vitalsData.head_circumference < 0 || vitalsData.head_circumference > 100)) {
        throw new Error('Head circumference value out of range');
      }

      // Additional safety checks for extremely large values
      if (vitalsData.height && vitalsData.height > 300) {
        throw new Error('Height value too large (max 300 cm)');
      }
      if (vitalsData.weight && vitalsData.weight > 200) {
        throw new Error('Weight value too large (max 200 kg)');
      }
      if (vitalsData.temperature && (vitalsData.temperature > 120 || vitalsData.temperature < 90)) {
        throw new Error('Temperature value out of valid range (90-120 °F)');
      }
      if (vitalsData.heart_rate && (vitalsData.heart_rate > 250 || vitalsData.heart_rate < 0)) {
        throw new Error('Heart rate value out of valid range (0-250 bpm)');
      }
      if (vitalsData.head_circumference && (vitalsData.head_circumference < 0 || vitalsData.head_circumference > 100)) {
        throw new Error('Head circumference value out of valid range (0-100 cm)');
      }

      // Final validation to ensure all values are finite numbers
      Object.entries(vitalsData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'visit_note_id' && key !== 'blood_pressure') {
          if (!Number.isFinite(value)) {
            throw new Error(`${key} value is not a valid number`);
          }
        }
      });

      try {
        const { error: vitalsError } = await supabase
          .from('visit_notes_vitals')
          .insert([vitalsData]);
                 if (vitalsError) {
           console.error('Vitals insertion error:', vitalsError);
           
           // Provide specific error messages for different constraint violations
           if (vitalsError.message.includes('valid_temperature')) {
             console.warn('Temperature constraint violated. Please check the temperature value.');
           } else if (vitalsError.message.includes('check constraint')) {
             console.warn('Database constraint violated:', vitalsError.message);
           }
           
           // Don't throw the error, just log it and continue
           // This allows the visit note to be saved even if vitals fail
           console.warn('Vitals insertion failed but visit note will be saved:', vitalsError.message);
         }
      } catch (vitalsInsertError) {
        console.error('Failed to insert vitals:', vitalsInsertError);
        // If vitals insertion fails, we should still save the visit note
        // but log the error for debugging
        console.warn('Visit note saved but vitals insertion failed:', vitalsInsertError.message);
      }
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