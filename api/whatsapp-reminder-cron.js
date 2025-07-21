const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // If not available, use global fetch in Node 18+

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
  // Only allow GET (Vercel cron will use GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Find all appointments for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, patient_id, clinic_id, date, time')
      .eq('date', tomorrowStr)
      .eq('status', 'scheduled');

    if (error) throw error;

    let sentCount = 0;
    for (const appt of appointments) {
      // Fetch patient and clinic info
      const { data: patient } = await supabase.from('patients').select('id, name, phone').eq('id', appt.patient_id).single();
      const { data: clinic } = await supabase.from('clinics').select('id, name').eq('id', appt.clinic_id).single();

      if (!patient || !clinic) continue;

      // Prepare template params (adjust as per your template)
      const templateParams = [
        patient.name,                // {{1}} Patient's Name
        clinic.name,                 // {{2}} Healthcare Facility
        `${appt.date} at ${appt.time}`, // {{3}} Date & Time details
        clinic.name                  // {{4}} Healthcare Facility (again)
      ];

      // You may want to check if WhatsApp is enabled for this clinic

      // Call your WhatsApp API endpoint
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-whatsapp-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: null, // Optionally set to a system user or admin
          clinicId: appt.clinic_id,
          patientId: appt.patient_id,
          messageType: 'appointment_reminder', // Use your actual template name
          templateParams
        })
      });

      sentCount++;
    }

    // Vaccination reminders: 2 days before due date
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const yyyy2 = twoDaysLater.getFullYear();
    const mm2 = String(twoDaysLater.getMonth() + 1).padStart(2, '0');
    const dd2 = String(twoDaysLater.getDate()).padStart(2, '0');
    const dueDateStr = `${yyyy2}-${mm2}-${dd2}`;

    const { data: vaccinations, error: vaccError } = await supabase
      .from('vaccinations')
      .select('id, patient_id, clinic_id, vaccine, due_date, given_date')
      .eq('due_date', dueDateStr)
      .is('given_date', null);

    if (vaccError) throw vaccError;

    for (const vacc of vaccinations) {
      // Fetch patient and clinic info
      const { data: patient } = await supabase.from('patients').select('id, name, phone').eq('id', vacc.patient_id).single();
      const { data: clinic } = await supabase.from('clinics').select('id, name').eq('id', vacc.clinic_id).single();
      if (!patient || !clinic) continue;
      // Prepare template params (adjust as per your template)
      const templateParams = [
        patient.name,                // {{1}} Patient's Name
        vacc.vaccine,                // {{2}} Vaccine Name
        vacc.due_date,               // {{3}} Due Date
        clinic.name                  // {{4}} Clinic Name
      ];
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-whatsapp-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: null, // Optionally set to a system user or admin
          clinicId: vacc.clinic_id,
          patientId: vacc.patient_id,
          messageType: 'vaccination_reminder', // Use your actual template name
          templateParams
        })
      });
      sentCount++;
    }

    return res.status(200).json({ success: true, sent: sentCount });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};