const emailService = require('./email-service');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patientEmail, patientName, appointmentDate, appointmentTime, doctorName, clinicName, clinicAddress, clinicPhone, notes } = req.body;

  if (!patientEmail || !patientName || !appointmentDate || !appointmentTime || !doctorName || !clinicName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const subject = `Appointment Confirmation - ${clinicName}`;
    const emailBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px #e5e7eb; padding: 32px 28px;">
        <h2 style="color: #2563eb; margin-bottom: 12px;">Appointment Confirmed!</h2>
        <p style="font-size: 1.1em; color: #222; margin-bottom: 18px;">Hi <b>${patientName}</b>,</p>
        <p style="color: #444; margin-bottom: 18px;">Your appointment has been <b>successfully scheduled</b>. Please find the details below:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
          <tr><td style="padding: 6px 0; color: #555; font-weight: bold;">Date:</td><td style="padding: 6px 0; color: #222;">${appointmentDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #555; font-weight: bold;">Time:</td><td style="padding: 6px 0; color: #222;">${appointmentTime}</td></tr>
          <tr><td style="padding: 6px 0; color: #555; font-weight: bold;">Doctor:</td><td style="padding: 6px 0; color: #222;">${doctorName}</td></tr>
          <tr><td style="padding: 6px 0; color: #555; font-weight: bold;">Clinic:</td><td style="padding: 6px 0; color: #222;">${clinicName}</td></tr>
          <tr><td style="padding: 6px 0; color: #555; font-weight: bold;">Address:</td><td style="padding: 6px 0; color: #222;">${clinicAddress || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #555; font-weight: bold;">Phone:</td><td style="padding: 6px 0; color: #222;">${clinicPhone || 'N/A'}</td></tr>
          ${notes ? `<tr><td style='padding: 6px 0; color: #555; font-weight: bold;'>Notes:</td><td style='padding: 6px 0; color: #222;'>${notes}</td></tr>` : ''}
        </table>
        <div style="margin: 18px 0; padding: 14px; background: #e0f2fe; border-radius: 8px; color: #0369a1; font-size: 1em;">
          <b>Please arrive 10 minutes early</b> and bring any relevant documents.
        </div>
        <div style="margin-top: 24px; color: #666; font-size: 0.98em;">
          Regards,<br/>
          <span style="color: #2563eb; font-weight: bold;">${clinicName} Team</span>
        </div>
      </div>
    `;

    const result = await emailService.sendEmail(
      patientEmail,
      subject,
      emailBody
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send email' });
    }
    return res.status(200).json({ success: true, message: 'Appointment confirmation email sent successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 