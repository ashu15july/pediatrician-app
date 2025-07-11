const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports.sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const msg = {
      to,
      from: 'pediacircle@proton.me', // Use your verified sender
      subject,
      html,
      attachments,
    };
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || error.toString() };
  }
}; 