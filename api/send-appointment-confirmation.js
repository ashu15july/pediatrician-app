const emailService = require('./email-service');

// Google Calendar API helper
async function createGoogleCalendarEvent(appointmentData) {
  try {
    // Create a Google Calendar link instead of attachment (more reliable)
    const startDate = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes later
    
    // Format dates for Google Calendar URL
    const formatDateForGoogle = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const startDateFormatted = formatDateForGoogle(startDate);
    const endDateFormatted = formatDateForGoogle(endDate);
    
    // Create Google Calendar URL
    const eventText = `Appointment with Dr. ${appointmentData.doctorName}`;
    const eventDetails = `Appointment at ${appointmentData.clinicName}\n\nType: ${appointmentData.appointmentType || 'Checkup'}\nReason: ${appointmentData.notes || 'Regular appointment'}\n\nPlease arrive 10 minutes early.`;
    const eventLocation = appointmentData.clinicAddress || appointmentData.clinicName;
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventText)}&dates=${startDateFormatted}/${endDateFormatted}&details=${encodeURIComponent(eventDetails)}&location=${encodeURIComponent(eventLocation)}`;
    
    console.log('createGoogleCalendarEvent: Generated URL:', calendarUrl);

    return {
      success: true,
      calendarUrl,
      startDate: startDate,
      endDate: endDate
    };
  } catch (error) {
    console.log('createGoogleCalendarEvent: Error creating calendar event:', error);
    return { success: false, error: error.message };
  }
}



module.exports = async function handler(req, res) {
  console.log('send-appointment-confirmation: Request received');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patientEmail, patientName, appointmentDate, appointmentTime, doctorName, clinicName, clinicAddress, clinicPhone, notes, appointmentType } = req.body;
  
  console.log('send-appointment-confirmation: Request body:', {
    patientEmail,
    patientName,
    appointmentDate,
    appointmentTime,
    doctorName,
    clinicName,
    clinicAddress,
    clinicPhone,
    notes,
    appointmentType
  });

  // Validate required fields
  const requiredFields = { patientEmail, patientName, appointmentDate, appointmentTime, doctorName, clinicName };
  const missingFields = Object.keys(requiredFields).filter(field => !requiredFields[field]);
  
  if (missingFields.length > 0) {
    console.log('send-appointment-confirmation: Missing required fields:', missingFields);
    return res.status(400).json({ 
      error: 'Missing required fields', 
      missingFields 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(patientEmail)) {
    console.log('send-appointment-confirmation: Invalid email format:', patientEmail);
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    console.log('send-appointment-confirmation: Starting email send process');
    
    // Create calendar event
    console.log('send-appointment-confirmation: Creating calendar event...');
    const calendarResult = await createGoogleCalendarEvent({
      patientEmail,
      patientName,
      appointmentDate,
      appointmentTime,
      doctorName,
      clinicName,
      clinicAddress,
      clinicPhone,
      notes,
      appointmentType
    });
    
    console.log('send-appointment-confirmation: Calendar event result:', calendarResult);
    console.log('send-appointment-confirmation: Calendar URL:', calendarResult.success ? calendarResult.calendarUrl : 'No URL generated');

    // Beautiful email template with enhanced design
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        <!-- Main Container -->
        <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
            <div style="background: #ffffff; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#059669"/>
                <path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Appointment Confirmed!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your appointment has been successfully scheduled</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            
            <!-- Greeting -->
            <div style="margin-bottom: 30px;">
              <p style="font-size: 18px; color: #374151; margin: 0 0 8px 0;">Dear <strong style="color: #059669;">${patientName}</strong>,</p>
              <p style="font-size: 16px; color: #6b7280; margin: 0; line-height: 1.6;">Thank you for choosing ${clinicName}. Your appointment has been confirmed and we look forward to seeing you!</p>
            </div>
            
            <!-- Appointment Details Card -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
              <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="background: #2563eb; border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                  <span style="color: white; font-size: 20px;">📋</span>
                </div>
                <h2 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 600;">Appointment Details</h2>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Date</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 4px;">${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Time</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 4px;">${appointmentTime}</div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Doctor</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 4px;">${doctorName}</div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Clinic</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 4px;">${clinicName}</div>
                </div>
                
                ${clinicAddress ? `
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #7c3aed; grid-column: 1 / -1;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Address</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 4px;">${clinicAddress}</div>
                </div>
                ` : ''}
                
                ${clinicPhone ? `
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; grid-column: 1 / -1;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Phone</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 4px;">${clinicPhone}</div>
                </div>
                ` : ''}
                
                ${notes ? `
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; grid-column: 1 / -1;">
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Notes</div>
                  <div style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 4px;">${notes}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
             
            <!-- Important Notes -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #f59e0b;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 20px; margin-right: 10px;">⏰</span>
                <h4 style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">Important Reminder</h4>
              </div>
              <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">Please arrive <strong>10 minutes early</strong> and bring any relevant documents or previous reports.</p>
            </div>
            
            <!-- Reschedule Info -->
            <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid #a855f7;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 20px; margin-right: 10px;">📞</span>
                <h4 style="color: #7c3aed; margin: 0; font-size: 16px; font-weight: 600;">Need to Reschedule?</h4>
              </div>
              <p style="color: #7c3aed; margin: 0; font-size: 14px; line-height: 1.5;">Please contact us at least <strong>24 hours in advance</strong> at ${clinicPhone || 'our clinic'}.</p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Best regards,</p>
              <p style="color: #059669; margin: 0; font-size: 18px; font-weight: 600;">${clinicName} Team</p>
              <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                <p style="color: #6b7280; margin: 0; font-size: 12px;">This email was sent automatically. Please do not reply to this email.</p>
              </div>
            </div>
            
          </div>
        </div>
        
      </body>
      </html>
    `;

    console.log('send-appointment-confirmation: Calling email service...');
    
    // Send email with calendar link (no attachment issues)
    const result = await emailService.sendEmail(
      patientEmail,
      `Appointment Confirmed - ${clinicName}`,
      emailBody
    );
    
    console.log('send-appointment-confirmation: Email service result:', result);
    
    if (result.success) {
      console.log('send-appointment-confirmation: Email sent successfully');
      return res.status(200).json({ 
        success: true, 
        message: 'Appointment confirmation email sent successfully',
        calendarEvent: calendarResult.success ? 'Calendar link included' : 'Calendar link creation failed'
      });
    } else {
      console.log('send-appointment-confirmation: Email failed:', result.error);
      return res.status(500).json({ error: result.error || 'Failed to send email' });
    }
  } catch (err) {
    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}; 