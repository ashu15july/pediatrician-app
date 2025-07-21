const emailService = require('./email-service');
const { createClient } = require('@supabase/supabase-js');
const { IAP_SCHEDULE } = require('../src/data/IAP_SCHEDULE');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper to calculate due date for a vaccine based on DOB and age requirement
function calculateDueDateFromDOB(dob, ageRequirement) {
  if (!dob) return '';
  const dateOfBirth = new Date(dob);
  let dueDate = new Date(dateOfBirth);
  if (ageRequirement === 'BIRTH') {
    return dateOfBirth.toISOString().split('T')[0];
  }
  const match = ageRequirement.match(/(\d+)\s*(mo|weeks|yrs)/);
  if (!match) return '';
  const [_, number, unit] = match;
  const num = parseInt(number);
  switch (unit) {
    case 'weeks':
      dueDate.setDate(dateOfBirth.getDate() + (num * 7));
      break;
    case 'mo':
      dueDate.setMonth(dateOfBirth.getMonth() + num);
      break;
    case 'yrs':
      dueDate.setFullYear(dateOfBirth.getFullYear() + num);
      break;
    default:
      return '';
  }
  return dueDate.toISOString().split('T')[0];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Fetch all patients
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id, name, dob, guardian_email, guardian_name');
    if (patientError) throw patientError;

    // Step 2: Fetch all vaccination records (for all patients)
    const { data: allVaccRecords, error: vaccError } = await supabase
      .from('vaccinations')
      .select('patient_id, vaccine, age_label, given_date');
    if (vaccError) throw vaccError;

    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in1Day = new Date(today);
    in1Day.setDate(today.getDate() + 1);
    const targetDueDates = [formatDate(in7Days), formatDate(in1Day)];

    // Step 3: For each patient, for each vaccine in the schedule, calculate due and check if already given
    const remindersByPatientAndDate = {};
    for (const patient of patients) {
      for (const { age, vaccines } of IAP_SCHEDULE) {
        for (const vaccine of vaccines) {
          const dueDateStr = calculateDueDateFromDOB(patient.dob, age);
          if (!dueDateStr) continue;
          if (!targetDueDates.includes(dueDateStr)) continue;
          // Check if already given
          const alreadyGiven = allVaccRecords.some(
            r => r.patient_id === patient.id && r.vaccine === vaccine && r.given_date
          );
          if (alreadyGiven) continue;
          // Group by patient and due date
          const key = `${patient.id}|${dueDateStr}`;
          if (!remindersByPatientAndDate[key]) remindersByPatientAndDate[key] = { patient, dueDate: dueDateStr, vaccines: [] };
          remindersByPatientAndDate[key].vaccines.push(vaccine);
        }
      }
    }

    // Step 4: Send grouped reminder emails
    let remindersSent = 0;
    for (const key of Object.keys(remindersByPatientAndDate)) {
      const { patient, dueDate, vaccines } = remindersByPatientAndDate[key];
      if (!patient.guardian_email) continue;
      const subject = `Vaccination Reminder: ${dueDate} for ${patient.name}`;
      const vaccineRows = vaccines.map(vaccine => `
        <tr>
          <td style=\"padding: 8px 12px; color: #222; border-bottom: 1px solid #e5e7eb;\">${vaccine}</td>
          <td style=\"padding: 8px 12px; color: #222; border-bottom: 1px solid #e5e7eb;\">${dueDate}</td>
        </tr>
      `).join('');
      const emailBody = `
        <div style=\"font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px #e5e7eb; padding: 32px 28px;\">
          <h2 style=\"color: #059669; margin-bottom: 12px;\">Vaccination Reminder</h2>
          <p style=\"font-size: 1.1em; color: #222; margin-bottom: 18px;\">Dear <b>${patient.guardian_name || patient.name}</b>,</p>
          <p style=\"color: #444; margin-bottom: 18px;\">This is a friendly reminder that the following vaccination(s) are due for <b>${patient.name}</b>:</p>
          <table style=\"width: 100%; border-collapse: collapse; margin-bottom: 18px; background: #fff; border-radius: 8px; overflow: hidden;\">
            <thead>
              <tr style=\"background: #e0f2fe;\">
                <th style=\"padding: 10px 12px; color: #0369a1; text-align: left; font-size: 1em;\">Vaccine</th>
                <th style=\"padding: 10px 12px; color: #0369a1; text-align: left; font-size: 1em;\">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${vaccineRows}
            </tbody>
          </table>
          <div style=\"margin: 18px 0; padding: 14px; background: #fef9c3; border-radius: 8px; color: #b45309; font-size: 1em;\">
            Please ensure your child receives these vaccinations on or before the due date.<br/>
            <span style=\"display:block; margin-top:8px; color:#92400e; font-size:0.97em;\">If you have already completed these vaccinations, please ignore this email.</span>
          </div>
          <div style=\"margin-top: 24px; color: #666; font-size: 0.98em;\">
            Regards,<br/>
            <span style=\"color: #059669; font-weight: bold;\">Your Pediatric Clinic</span>
          </div>
        </div>
      `;
      const result = await emailService.sendEmail(
        patient.guardian_email,
        subject,
        emailBody
      );
      if (result.success) remindersSent++;
    }

    return res.status(200).json({ success: true, remindersSent });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 