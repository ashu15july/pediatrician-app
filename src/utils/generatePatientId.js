import { supabase } from '../lib/supabase';

/**
 * Generates a unique Patient ID for a clinic
 * Format: [Clinic Initials][5-digit number]
 * Example: RC00001, RC00002, etc.
 * 
 * @param {string} clinicName - The name of the clinic
 * @param {string} clinicId - The clinic ID for database queries
 * @returns {Promise<string>} - The generated Patient ID
 */
export const generatePatientId = async (clinicName, clinicId) => {
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
      // Error fetching existing patient IDs
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
    
    return `${initials}${formattedNumber}`;
  } catch (error) {
    // Error generating patient ID
    throw new Error('Failed to generate patient ID');
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
 * Extracts clinic initials from a Patient ID
 * @param {string} patientId - The patient ID
 * @returns {string} - The clinic initials
 */
export const extractClinicInitials = (patientId) => {
  if (!validatePatientId(patientId)) {
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
      // Error getting next patient number
      throw error;
    }

    return data || 1;
  } catch (error) {
    // Error getting next patient number
    throw new Error('Failed to get next patient number');
  }
}; 