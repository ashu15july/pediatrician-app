// api/reset-password.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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
      console.error('Error finding user:', userError);
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
      console.log('Token check failed:', {
        user: user,
        submittedToken: token,
        dbToken: user ? user.reset_token : undefined,
        dbExpiry: user ? user.reset_token_expires_at : undefined,
        now: new Date().toISOString(),
        expiry: expiry.toISOString()
      });
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
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unexpected error in reset password handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};