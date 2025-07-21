const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const emailService = require('./email-service');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;

  try {
    if (action === 'login') {
      // Login logic
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      delete user.password_hash;
      delete user.reset_token;
      delete user.reset_token_expires_at;
      return res.status(200).json({ success: true, user });
    } else if (action === 'request-password-reset') {
      // Request password reset logic
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      // Find user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, role, clinic_id')
        .eq('email', email)
        .single();
      if (userError || !user) {
        // Always respond with success for security reasons
        return res.status(200).json({ success: false, message: 'Email not found in our system. Please check your email address or contact your administrator.' });
      }
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
      // Store OTP and expiry
      const { error: updateError } = await supabase
        .from('users')
        .update({ reset_otp: otp, reset_otp_expires_at: expiresAt })
        .eq('id', user.id);
      if (updateError) {
        return res.status(500).json({ error: 'Failed to process request' });
      }
      // Send email
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
      const emailResult = await emailService.sendEmail(
        email,
        'Password Reset OTP - Pediatrician App',
        emailHtml
      );
      if (!emailResult.success) {
        return res.status(500).json({ error: 'Failed to send email' });
      }
      return res.status(200).json({ success: true, message: 'If your email is registered, you will receive an OTP.' });
    } else if (action === 'verify-otp') {
      // Verify OTP logic
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }
      // Find user and check OTP
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('reset_otp, reset_otp_expires_at')
        .eq('email', email)
        .single();
      if (userError) {
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
        return res.status(500).json({ error: 'Failed to process verification' });
      }
      // Send confirmation email
      try {
        await emailService.sendEmail(
          email,
          'OTP Verified - Pediatrician App',
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
          </div>`
        );
      } catch (emailError) {
        // Don't fail the request if confirmation email fails
      }
      return res.status(200).json({ 
        success: true, 
        message: 'OTP verified successfully',
        token: token
      });
    } else if (action === 'reset-password') {
      // Reset password logic
      const { email, token, newPassword } = req.body;
      if (!email || !token || !newPassword) {
        return res.status(400).json({ error: 'Email, token, and new password are required' });
      }
      // Find user and check token
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, reset_token, reset_token_expires_at')
        .eq('email', email)
        .single();
      if (userError) {
        return res.status(500).json({ error: 'Server error' });
      }
      // Parse expiry as UTC (add 'Z' if missing)
      const expiry = user && user.reset_token_expires_at && user.reset_token_expires_at.endsWith('Z')
        ? new Date(user.reset_token_expires_at)
        : new Date((user && user.reset_token_expires_at ? user.reset_token_expires_at : '') + 'Z');
      if (
        !user ||
        !user.reset_token ||
        !user.reset_token_expires_at ||
        String(user.reset_token).trim() !== String(token).trim() ||
        expiry < new Date()
      ) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // Update password and clear token fields
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          reset_token: null,
          reset_token_expires_at: null
        })
        .eq('id', user.id);
      if (updateError) {
        return res.status(500).json({ error: 'Failed to update password' });
      }
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 