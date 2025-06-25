// api/verify-otp.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // Find user and check OTP
  const { data: user } = await supabase
    .from('users')
    .select('reset_otp, reset_otp_expires_at')
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

  // OTP is valid
  return res.status(200).json({ success: true });
}