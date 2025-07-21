const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // If not available, use global fetch in Node 18+

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Parse and validate input
    const { userId, clinicId, patientId, messageType, templateParams } = req.body;
    if (!userId || !clinicId || !patientId || !messageType || !templateParams) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Fetch user and check they belong to the clinic
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, clinic_id, role')
      .eq('id', userId)
      .single();
    if (userError || !user) {
      return res.status(401).json({ error: 'User not found or unauthorized' });
    }
    if (user.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'User does not belong to this clinic' });
    }

    // 3. Fetch patient and check they belong to the clinic
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, phone, clinic_id')
      .eq('id', patientId)
      .single();
    if (patientError || !patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (patient.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Patient does not belong to this clinic' });
    }

    // 4. Fetch clinic WhatsApp credentials
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('whatsapp_app_id, whatsapp_api_key, whatsapp_number, whatsapp_display_name')
      .eq('id', clinicId)
      .single();
    if (clinicError || !clinic || !clinic.whatsapp_api_key || !clinic.whatsapp_number) {
      return res.status(400).json({ error: 'Clinic WhatsApp not configured' });
    }

    // 5. Prepare Gupshup API call
    const gupshupUrl = 'https://api.gupshup.io/sm/api/v1/msg';
    const gupshupBody = new URLSearchParams({
      channel: 'whatsapp',
      source: clinic.whatsapp_number,
      destination: patient.phone,
      'src.name': clinic.whatsapp_display_name || 'Clinic',
      template: messageType, // e.g., 'visit_note_report'
      'template.params': JSON.stringify(templateParams)
    });

    // 6. Send message via Gupshup
    const gupshupRes = await fetch(gupshupUrl, {
      method: 'POST',
      headers: {
        apikey: clinic.whatsapp_api_key,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: gupshupBody
    });
    const gupshupData = await gupshupRes.json();

    // 7. Log message in whatsapp_messages
    await supabase.from('whatsapp_messages').insert([{
      clinic_id: clinicId,
      patient_id: patientId,
      sent_by_user_id: userId,
      message_type: messageType,
      template_name: messageType,
      message_content: JSON.stringify(templateParams),
      status: gupshupData.status || 'sent',
      gupshup_message_id: gupshupData.messageId || null
    }]);

    // 8. Return result
    return res.status(200).json({ success: true, gupshup: gupshupData });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 