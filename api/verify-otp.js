// api/verify-otp.js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { email, otp } = req.body;
    console.log('Verifying OTP for:', email, 'OTP:', otp);
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find user and check OTP
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('reset_otp, reset_otp_expires_at')
      .eq('email', email)
      .single();

    console.log('User from DB:', user);
    if (user) {
      console.log('DB OTP:', user.reset_otp, 'DB Expiry:', user.reset_otp_expires_at);
    }

    if (userError) {
      console.error('Error finding user:', userError);
      return res.status(500).json({ error: 'Server error' });
    }

    // Parse expiry as UTC (add 'Z' if missing)
    const expiry = user.reset_otp_expires_at.endsWith('Z')
      ? new Date(user.reset_otp_expires_at)
      : new Date(user.reset_otp_expires_at + 'Z');

    if (
      !user ||
      !user.reset_otp ||
      !user.reset_otp_expires_at ||
      String(user.reset_otp).trim() !== String(otp).trim() ||
      expiry < new Date()
    ) {
      console.log('OTP check failed:', {
        user: user,
        submittedOtp: otp,
        dbOtp: user ? user.reset_otp : undefined,
        dbExpiry: user ? user.reset_otp_expires_at : undefined,
        now: new Date().toISOString(),
        expiry: expiry.toISOString()
      });
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // OTP is valid - clear the OTP and generate a token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // Update user with token and clear OTP
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        reset_token: token, 
        reset_token_expires_at: tokenExpiresAt,
        reset_otp: null,
        reset_otp_expires_at: null
      })
      .eq('email', email);

    if (updateError) {
      console.error('Error updating user with token:', updateError);
      return res.status(500).json({ error: 'Failed to process verification' });
    }

    // Send confirmation email
    try {
      await resend.emails.send({
        from: 'no-reply@pediacircle.com', // Use your verified domain
        to: email,
        subject: 'OTP Verified - Pediatrician App',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">OTP Verification Successful</h2>
            <p>Your OTP has been verified successfully. You can now proceed to reset your password.</p>
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="color: #166534; margin: 0;">✅ Verification Complete</h3>
              <p style="color: #166534; margin: 10px 0;">Your account has been verified and you can now reset your password.</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request this verification, please contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              This is an automated message from the Pediatrician App. Please do not reply to this email.
            </p>
          </div>
        `,
        text: `Your OTP has been verified successfully. You can now proceed to reset your password.`
      });
      console.log('Confirmation email sent successfully to:', email);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      console.error('Email error details:', emailError.message);
      // Don't fail the request if confirmation email fails
    }

    return res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully',
      token: token
    });
  } catch (error) {
    console.error('Unexpected error in verify OTP handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};