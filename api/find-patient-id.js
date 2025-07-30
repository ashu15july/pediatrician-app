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

    // Find patient by guardian information
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, patient_id, name, guardian_name, guardian_phone')
      .eq('name', patientName)
      .eq('guardian_name', guardianName)
      .eq('guardian_phone', guardianPhone)
      .eq('clinic_id', clinicId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (patients && patients.length > 0) {
      return res.status(200).json({ 
        success: true, 
        patientId: patients[0].patient_id,
        patientName: patients[0].name,
        guardianPhone: patients[0].guardian_phone
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: 'No patient found with the provided information' 
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 