const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const getStream = require('get-stream');
const path = require('path');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Load milestones data once
let milestonesData = null;
try {
  const milestonesPath = path.join(__dirname, '../src/data/milestones.json');
  milestonesData = JSON.parse(fs.readFileSync(milestonesPath, 'utf8'));
} catch (e) {
  milestonesData = { milestones: [] };
}

// Import or copy PDF generation helpers from send-patient-email.js
const { generatePatientPDF } = require('./send-patient-email');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { patientId, whatsapp, subject, emailOption } = req.body;
  if (!patientId || !whatsapp) {
    return res.status(400).json({ error: 'Missing patientId or whatsapp' });
  }

  try {
    // Fetch patient, notes, vaccination, clinic
    const [
      { data: patient },
      { data: visitNotes },
      { data: vaccinationRecords }
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('visit_notes').select('*, doctor:users!visit_notes_user_id_fkey(id, full_name), visit_notes_vitals (*)').eq('patient_id', patientId),
      supabase.from('vaccinations').select('*').eq('patient_id', patientId)
    ]);
    let clinic = null;
    if (patient && patient.clinic_id) {
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('id, name, whatsapp_app_id, whatsapp_api_key, whatsapp_number')
        .eq('id', patient.clinic_id)
        .single();
      clinic = clinicData;
    }
    if (!clinic || !clinic.whatsapp_app_id || !clinic.whatsapp_api_key) {
      return res.status(400).json({ error: 'Clinic WhatsApp credentials not configured' });
    }

    // Generate PDF buffer
    const pdfBuffer = await generatePatientPDF({ patient, visitNotes, vaccinationRecords, clinic }, {
      notes: emailOption === 'notes' || emailOption === 'both',
      vaccination: emailOption === 'vaccination' || emailOption === 'both'
    });

    // Upload PDF to Supabase Storage (or use a temp public URL)
    const fileName = `patient-report-${patient.id}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public')
      .upload(`reports/${fileName}`, pdfBuffer, { contentType: 'application/pdf', upsert: true });
    if (uploadError) {
      return res.status(500).json({ error: 'Failed to upload PDF' });
    }
    const { publicURL } = supabase.storage.from('public').getPublicUrl(`reports/${fileName}`);

    // Send WhatsApp message via Gupshup API
    const gupshupUrl = 'https://api.gupshup.io/sm/api/v1/msg';
    const message = `${subject || 'Patient Report'}\nPlease find your report attached.`;
    const gupshupRes = await fetch(gupshupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': clinic.whatsapp_api_key
      },
      body: new URLSearchParams({
        channel: 'whatsapp',
        source: clinic.whatsapp_number,
        destination: whatsapp,
        'src.name': clinic.name,
        'message': JSON.stringify({ type: 'file', url: publicURL, caption: message })
      })
    });
    const gupshupData = await gupshupRes.json();
    if (!gupshupRes.ok || gupshupData.status !== 'submitted') {
      return res.status(500).json({ error: 'Failed to send WhatsApp message', details: gupshupData });
    }

    // Optionally log the message in whatsapp_messages table
    await supabase.from('whatsapp_messages').insert([
      {
        clinic_id: clinic.id,
        patient_id: patient.id,
        sent_by_user_id: null, // Not tracked here
        message_type: 'patient_report',
        template_name: null,
        message_content: message,
        status: 'sent',
        gupshup_message_id: gupshupData.messageId || null
      }
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 