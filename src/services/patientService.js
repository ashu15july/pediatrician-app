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
      .select('*')
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
      .select('*')
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
        development_milestones,
        doctors (
          id,
          users (
            id,
            full_name
          )
        ),
        visit_notes_vitals (*)
      `)
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId)
      .order('visit_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch visit notes');
  }
};

// Add this new function to get doctor ID from user ID
const getDoctorIdFromUserId = async (userId) => {
  try {
    console.log('Looking up doctor ID for user ID:', userId);
    
    // First, let's check if the user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error checking user:', userError);
      throw new Error('User not found');
    }

    console.log('Found user:', userData);

    // Then look up the doctor
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', userId);

    if (doctorError) {
      console.error('Error checking doctor:', doctorError);
      throw doctorError;
    }

    console.log('Found doctor data:', doctorData);

    if (!doctorData || doctorData.length === 0) {
      console.error('No doctor found for user ID:', userId);
      throw new Error('No doctor record found for this user');
    }

    if (doctorData.length > 1) {
      console.error('Multiple doctors found for user ID:', userId);
      throw new Error('Multiple doctor records found for this user');
    }

    console.log('Found doctor ID:', doctorData[0].id);
    return doctorData[0].id;
  } catch (error) {
    console.error('Error getting doctor ID:', error);
    throw new Error('Failed to get doctor ID: ' + error.message);
  }
};

export const addVisitNote = async (noteData) => {
  try {
    console.log('Adding visit note with data:', noteData);

    // Get the doctor ID from the user ID
    const doctorId = await getDoctorIdFromUserId(noteData.doctor_id);
    console.log('Retrieved doctor ID:', doctorId);

    // First, create the visit note
    const { data: visitNote, error: visitNoteError } = await supabase
      .from('visit_notes')
      .insert([{
        patient_id: noteData.patient_id,
        doctor_id: doctorId,
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
        development_milestones: noteData.development_milestones
      }])
      .select()
      .single();

    if (visitNoteError) {
      console.error('Error creating visit note:', visitNoteError);
      throw visitNoteError;
    }

    console.log('Visit note created:', visitNote);

    // Then, create the vitals record
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

      if (vitalsError) {
        console.error('Error creating vitals:', vitalsError);
        throw vitalsError;
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
    console.error('Error fetching vaccinations:', error.message || error);
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
    console.error('Error upserting vaccination:', error.message || error);
    throw error;
  }
  return data;
}; 