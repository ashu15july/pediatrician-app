// api/request-password-reset.js
const { createClient } = require('@supabase/supabase-js');
const emailService = require('./email-service');

// Debug environment variables
console.log('Environment variables check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER || 'resend');
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET');
console.log('Email service provider:', emailService.provider);

// Check if environment variables are available
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Supabase environment variables are not set');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
}

// Only create client if environment variables are available
let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

module.exports = async function handler(req, res) {
  // Enable CORS for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Processing password reset request for email:', email);

    // Check if Supabase is configured
    if (!supabase) {
      console.error('Supabase not configured - missing environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Supabase environment variables are missing'
      });
    }

    // Find user with more detailed logging
    console.log('Attempting to find user with email:', email);
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, clinic_id')
      .eq('email', email)
      .single();

    console.log('Query result:', { user, userError });

    if (userError) {
      console.error('Error finding user:', userError);
      console.error('Error code:', userError.code);
      console.error('Error message:', userError.message);
      
      // Check if it's a "not found" error vs other error
      if (userError.code === 'PGRST116') {
        console.log('User not found in database:', email);
        return res.status(200).json({ 
          success: false, 
          message: 'Email not found in our system. Please check your email address or contact your administrator.' 
        });
      }
      // For other errors, don't reveal if user exists or not for security
      return res.status(200).json({ success: true, message: 'If your email is registered, you will receive an OTP.' });
    }

    if (!user) {
      // Always respond with success for security reasons
      console.log('User not found, but responding with success for security');
      return res.status(200).json({ 
        success: false, 
        message: 'Email not found in our system. Please check your email address or contact your administrator.' 
      });
    }

    console.log('Found user:', { id: user.id, email: user.email, role: user.role, clinic_id: user.clinic_id });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    console.log('Generated OTP for user:', user.id);

    // Store OTP and expiry
    const { error: updateError } = await supabase
      .from('users')
      .update({ reset_otp: otp, reset_otp_expires_at: expiresAt })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user with OTP:', updateError);
      return res.status(500).json({ error: 'Failed to process request' });
    }

    // Send email via email service
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>You have requested to reset your password for the Pediatrician App.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0;">Your OTP Code</h3>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 10px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; margin: 0;">This code will expire in 10 minutes</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request this password reset, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          This is an automated message from the Pediatrician App. Please do not reply to this email.
        </p>
      </div>
    `;

    console.log('About to send email using provider:', emailService.provider);
    const emailResult = await emailService.sendEmail(
      email,
      'Password Reset OTP - Pediatrician App',
      emailHtml
    );

    if (!emailResult.success) {
      console.error('Error sending email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    console.log('Email sent successfully to:', email);

    // Always respond with success for security
    return res.status(200).json({ 
      success: true, 
      message: 'If your email is registered, you will receive an OTP.' 
    });

  } catch (error) {
    console.error('Unexpected error in password reset handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};