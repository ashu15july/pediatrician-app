import { supabase } from '../lib/supabase';
import { getVisitNotes } from './patientService';

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message}`);
};

// Test Reports Operations
export const getTestReports = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('test_reports')
      .select(`
        *,
        uploaded_by:users(full_name)
      `)
      .eq('patient_id', patientId)
      .order('test_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch test reports');
  }
};

export const uploadTestReport = async (patientId, reportData, file) => {
  try {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('test-reports')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('test-reports')
      .getPublicUrl(fileName);

    // Create test report record
    const { data, error } = await supabase
      .from('test_reports')
      .insert([{
        patient_id: patientId,
        test_name: reportData.test_name,
        test_date: reportData.test_date,
        report_file_url: publicUrl,
        notes: reportData.notes,
        uploaded_by: reportData.uploaded_by
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'upload test report');
  }
};

// Growth Records Operations
export const getGrowthRecords = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('growth_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch growth records');
  }
};

export const addGrowthRecord = async (recordData) => {
  try {
    const { data, error } = await supabase
      .from('growth_records')
      .insert([{
        patient_id: recordData.patient_id,
        date: recordData.date,
        height: recordData.height,
        weight: recordData.weight,
        head_circumference: recordData.head_circumference,
        percentile_height: recordData.percentile_height,
        percentile_weight: recordData.percentile_weight,
        percentile_head: recordData.percentile_head
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'add growth record');
  }
};

// Vaccination Records Operations
export const getVaccinationRecords = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('vaccinations')
      .select(`
        *,
        administered_by:doctors(user_id, specialization)
      `)
      .eq('patient_id', patientId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetch vaccination records');
  }
};

export const scheduleVaccination = async (vaccinationData) => {
  try {
    const { data, error } = await supabase
      .from('vaccinations')
      .insert([{
        patient_id: vaccinationData.patient_id,
        vaccine_name: vaccinationData.vaccine_name,
        scheduled_date: vaccinationData.scheduled_date,
        status: 'scheduled'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'schedule vaccination');
  }
};

export const updateVaccinationStatus = async (vaccinationId, status, doctorId) => {
  try {
    const { data, error } = await supabase
      .from('vaccinations')
      .update({
        status,
        administered_date: status === 'administered' ? new Date().toISOString() : null,
        administered_by: status === 'administered' ? doctorId : null
      })
      .eq('id', vaccinationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'update vaccination status');
  }
};

// PDF Generation
export const generatePatientReport = async (patientId) => {
  try {
    // Fetch all patient data
    const [
      patientData,
      visitNotes,
      growthRecords,
      testReports,
      vaccinationRecords
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      getVisitNotes(patientId),
      getGrowthRecords(patientId),
      getTestReports(patientId),
      getVaccinationRecords(patientId)
    ]);

    // Combine all data
    const reportData = {
      patient: patientData.data,
      visitNotes: visitNotes,
      growthRecords: growthRecords,
      testReports: testReports,
      vaccinationRecords: vaccinationRecords
    };

    return reportData;
  } catch (error) {
    handleSupabaseError(error, 'generate patient report');
  }
}; 