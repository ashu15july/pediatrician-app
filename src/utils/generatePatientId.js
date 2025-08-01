import { supabase } from '../lib/supabase';

/**
 * Generates a unique Patient ID for a clinic with retry logic to handle race conditions
 * Format: [Clinic Initials][5-digit number]
 * Example: RC00001, RC00002, etc.
 * 
 * @param {string} clinicName - The name of the clinic
 * @param {string} clinicId - The clinic ID for database queries
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<string>} - The generated Patient ID
 */
export const generatePatientId = async (clinicName, clinicId, maxRetries = 3) => {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // Extract initials from clinic name
      const initials = clinicName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 3); // Take max 3 initials
      
      // Get the next available number for this clinic by querying existing patients
      const { data: existingPatients, error } = await supabase
        .from('patients')
        .select('patient_id')
        .eq('clinic_id', clinicId)
        .not('patient_id', 'is', null)
        .like('patient_id', `${initials}%`)
        .order('patient_id', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      let nextNumber = 1;
      
      if (existingPatients && existingPatients.length > 0) {
        // Extract the number from the last patient ID
        const lastPatientId = existingPatients[0].patient_id;
        const lastNumber = parseInt(lastPatientId.replace(initials, ''));
        
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // Format the number with leading zeros (5 digits)
      const formattedNumber = nextNumber.toString().padStart(5, '0');
      const generatedId = `${initials}${formattedNumber}`;
      
      // Verify the ID doesn't already exist (double-check for race conditions)
      const { data: existingPatient, error: checkError } = await supabase
        .from('patients')
        .select('patient_id')
        .eq('patient_id', generatedId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      if (existingPatient) {
        // ID already exists, retry with next number
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error('Unable to generate unique patient ID after maximum retries');
        }
        continue;
      }

      return generatedId;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error(`Failed to generate patient ID after ${maxRetries} attempts: ${error.message}`);
      }
      // Wait a bit before retrying to reduce race conditions
      await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
    }
  }
};

/**
 * Alternative method using timestamp-based ID generation to avoid race conditions
 * Format: [Clinic Initials][YYYYMMDD][3-digit sequence]
 * Example: RC20241201001, RC20241201002, etc.
 * 
 * @param {string} clinicName - The name of the clinic
 * @param {string} clinicId - The clinic ID for database queries
 * @returns {Promise<string>} - The generated Patient ID
 */
export const generateTimestampPatientId = async (clinicName, clinicId) => {
  try {
    // Extract initials from clinic name
    const initials = clinicName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3); // Take max 3 initials
    
    // Get current date in YYYYMMDD format
    const today = new Date();
    const dateString = today.getFullYear().toString() +
                      (today.getMonth() + 1).toString().padStart(2, '0') +
                      today.getDate().toString().padStart(2, '0');
    
    // Get the next sequence number for today
    const { data: existingPatients, error } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('clinic_id', clinicId)
      .like('patient_id', `${initials}${dateString}%`)
      .order('patient_id', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    let sequenceNumber = 1;
    
    if (existingPatients && existingPatients.length > 0) {
      const lastPatientId = existingPatients[0].patient_id;
      const lastSequence = parseInt(lastPatientId.slice(-3));
      
      if (!isNaN(lastSequence)) {
        sequenceNumber = lastSequence + 1;
      }
    }

    // Format sequence number with leading zeros (3 digits)
    const formattedSequence = sequenceNumber.toString().padStart(3, '0');
    
    return `${initials}${dateString}${formattedSequence}`;
  } catch (error) {
    throw new Error(`Failed to generate timestamp-based patient ID: ${error.message}`);
  }
};

/**
 * Validates if a Patient ID is in the correct format
 * @param {string} patientId - The patient ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePatientId = (patientId) => {
  if (!patientId || typeof patientId !== 'string') {
    return false;
  }
  
  // Check if it matches the pattern: 2-3 letters followed by 5 digits
  const pattern = /^[A-Z]{2,3}\d{5}$/;
  return pattern.test(patientId);
};

/**
 * Validates if a timestamp-based Patient ID is in the correct format
 * @param {string} patientId - The patient ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateTimestampPatientId = (patientId) => {
  if (!patientId || typeof patientId !== 'string') {
    return false;
  }
  
  // Check if it matches the pattern: 2-3 letters + 8 digits (YYYYMMDD) + 3 digits
  const pattern = /^[A-Z]{2,3}\d{8}\d{3}$/;
  return pattern.test(patientId);
};

/**
 * Extracts clinic initials from a Patient ID
 * @param {string} patientId - The patient ID
 * @returns {string} - The clinic initials
 */
export const extractClinicInitials = (patientId) => {
  if (!validatePatientId(patientId) && !validateTimestampPatientId(patientId)) {
    return null;
  }
  
  // Extract letters before the numbers
  return patientId.replace(/\d+$/, '');
};

/**
 * Extracts the number part from a Patient ID
 * @param {string} patientId - The patient ID
 * @returns {number} - The number part
 */
export const extractPatientNumber = (patientId) => {
  if (!validatePatientId(patientId)) {
    return null;
  }
  
  // Extract numbers at the end
  const numberPart = patientId.match(/\d+$/);
  return numberPart ? parseInt(numberPart[0]) : null;
};

/**
 * Helper function to get the next patient number for a clinic
 * This uses the database function for better performance
 */
export const getNextPatientNumber = async (clinicSubdomain) => {
  try {
    const { data, error } = await supabase
      .rpc('get_next_patient_number_for_clinic', { clinic_subdomain: clinicSubdomain });

    if (error) {
      throw error;
    }

    return data || 1;
  } catch (error) {
    throw new Error('Failed to get next patient number');
  }
}; 