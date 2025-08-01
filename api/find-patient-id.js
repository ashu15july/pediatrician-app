const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { patientName, guardianName, guardianPhone, clinicId } = req.body;

  try {
    // Validate required fields
    if (!patientName || !guardianName || !guardianPhone || !clinicId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['patientName', 'guardianName', 'guardianPhone', 'clinicId']
      });
    }

    // First, try to find the clinic by ID
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name')
      .eq('id', clinicId)
      .single();

    if (clinicError || !clinic) {
      return res.status(404).json({ 
        success: false, 
        error: 'Clinic not found' 
      });
    }

    // Find patient by guardian information - using exact field names from database
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, patient_id, name, guardian_name, guardian_phone, clinic_id')
      .eq('name', patientName.trim())
      .eq('guardian_name', guardianName.trim())
      .eq('guardian_phone', guardianPhone.trim())
      .eq('clinic_id', clinicId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (patients && patients.length > 0) {
      const patient = patients[0];
      return res.status(200).json({ 
        success: true, 
        patientId: patient.patient_id,
        patientName: patient.name,
        guardianPhone: patient.guardian_phone
      });
    } else {
      // Try a more flexible search (case-insensitive, partial matches)
      const { data: flexiblePatients, error: flexibleError } = await supabase
        .from('patients')
        .select('id, patient_id, name, guardian_name, guardian_phone, clinic_id')
        .eq('clinic_id', clinicId)
        .ilike('name', `%${patientName.trim()}%`)
        .ilike('guardian_name', `%${guardianName.trim()}%`)
        .ilike('guardian_phone', `%${guardianPhone.trim()}%`);

      if (flexibleError) {
        console.error('Flexible search error:', flexibleError);
        return res.status(500).json({ error: 'Database error occurred during flexible search' });
      }

      if (flexiblePatients && flexiblePatients.length > 0) {
        const patient = flexiblePatients[0];
        return res.status(200).json({ 
          success: true, 
          patientId: patient.patient_id,
          patientName: patient.name,
          guardianPhone: patient.guardian_phone
        });
      }

      return res.status(404).json({ 
        success: false, 
        error: 'No patient found with the provided information. Please check your details or contact the clinic.' 
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 