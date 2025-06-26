// api/request-password-reset.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Check if environment variables are available
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not set');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Supabase environment variables are not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
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
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Supabase not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error finding user:', userError);
      // Don't reveal if user exists or not for security
    }

    if (!user) {
      // Always respond with success for security reasons
      console.log('User not found, but responding with success for security');
      return res.status(200).json({ success: true, message: 'If your email is registered, you will receive an OTP.' });
    }

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

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Send email via Resend
    try {
      await resend.emails.send({
        from: 'no-reply@pediacircle.com',
        to: email,
        subject: 'Your Password Reset OTP',
        text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
      });
      console.log('Email sent successfully to:', email);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    // Always respond with success for security
    return res.status(200).json({ 
      success: true, 
      message: 'If your email is registered, you will receive an OTP.' 
    });

  } catch (error) {
    console.error('Unexpected error in password reset handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}