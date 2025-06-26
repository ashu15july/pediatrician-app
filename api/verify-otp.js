// api/verify-otp.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
      console.error('Error finding user:', userError);
      return res.status(500).json({ error: 'Server error' });
    }

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
  } catch (error) {
    console.error('Unexpected error in verify OTP handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};