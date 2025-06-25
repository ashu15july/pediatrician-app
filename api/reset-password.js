// api/reset-password.js
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }

  // Find user and check OTP
  const { data: user } = await supabase
    .from('users')
    .select('id, reset_otp, reset_otp_expires_at')
    .eq('email', email)
    .single();

  if (
    !user ||
    !user.reset_otp ||
    !user.reset_otp_expires_at ||
    user.reset_otp !== otp ||
    new Date(user.reset_otp_expires_at) < new Date()
  ) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and clear OTP fields
  await supabase
    .from('users')
    .update({
      password: hashedPassword,
      reset_otp: null,
      reset_otp_expires_at: null
    })
    .eq('id', user.id);

  return res.status(200).json({ success: true });
}