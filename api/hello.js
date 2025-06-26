module.exports = async function handler(req, res) {
  return res.status(200).json({ 
    message: 'Hello from Vercel API!',
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY
    }
  });
}; 