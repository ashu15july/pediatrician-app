const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid';
    console.log('[EmailService] Initialized with provider:', this.provider);
    console.log('[EmailService] EMAIL_PROVIDER env var:', process.env.EMAIL_PROVIDER);
    console.log('[EmailService] SENDGRID_API_KEY available:', !!process.env.SENDGRID_API_KEY);
  }

  async sendEmail(to, subject, html, from = null) {
    console.log('[EmailService] sendEmail called with provider:', this.provider);
    switch (this.provider) {
      case 'sendgrid':
        return this.sendViaSendGrid(to, subject, html, from);
      case 'mailpit':
        return this.sendViaMailpit(to, subject, html, from);
      default:
        console.log('[EmailService] Using default provider (sendgrid)');
        return this.sendViaSendGrid(to, subject, html, from);
    }
  }

  async sendViaSendGrid(to, subject, html, from) {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('[SendGrid] SENDGRID_API_KEY is missing!');
      return { success: false, error: 'SENDGRID_API_KEY is missing' };
    }
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });

      // TODO: To use a custom email, set up Sender Authentication in SendGrid:
      // 1. Go to SendGrid Dashboard → Settings → Sender Authentication
      // 2. Choose "Verify a Single Sender" 
      // 3. Use an email you can access (e.g., ashu15july@gmail.com)
      // 4. Follow the verification process
      // 5. Change the email below to your verified email
      const info = await transporter.sendMail({
        from: from || 'noreply@sendgrid.net', // Use SendGrid default for immediate testing
        to: to,
        subject: subject,
        html: html
      });

      console.log('Email sent via SendGrid:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[SendGrid] Email sending failed:', error);
      if (error && error.stack) {
        console.error('[SendGrid] Stack trace:', error.stack);
      }
      return { success: false, error: error.message || error };
    }
  }

  async sendViaMailpit(to, subject, html, from) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false,
        auth: {
          user: '',
          pass: ''
        }
      });

      const info = await transporter.sendMail({
        from: from || 'noreply@sendgrid.net',
        to: to,
        subject: subject,
        html: html
      });

      console.log('Email sent via Mailpit:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[Mailpit] Email sending failed:', error);
      if (error && error.stack) {
        console.error('[Mailpit] Stack trace:', error.stack);
      }
      return { success: false, error: error.message || error };
    }
  }
}

module.exports = new EmailService(); 