const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html, attachments = []) {
  try {
    const msg = {
      to,
      from: 'pediacircle@proton.me', // Use your verified sender
      subject,
      html,
    };
    
    // Only add attachments if they exist and are valid
    if (attachments && attachments.length > 0) {
      msg.attachments = attachments;
    }
    
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || error.toString() };
  }
}

module.exports = { sendEmail }; 