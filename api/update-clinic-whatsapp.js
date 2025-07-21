const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
      clinicId, 
      whatsappAppId, 
      whatsappApiKey, 
      whatsappNumber, 
      whatsappDisplayName 
    } = req.body;

    // Validate required fields
    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' });
    }

    if (!whatsappApiKey || !whatsappNumber) {
      return res.status(400).json({ error: 'WhatsApp API Key and Phone Number are required' });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(whatsappNumber)) {
      return res.status(400).json({ 
        error: 'Phone number must be in international format (e.g., +1234567890)' 
      });
    }

    // Update clinic WhatsApp configuration
    const { data, error } = await supabase
      .from('clinics')
      .update({
        whatsapp_app_id: whatsappAppId || null,
        whatsapp_api_key: whatsappApiKey,
        whatsapp_number: whatsappNumber,
        whatsapp_display_name: whatsappDisplayName || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', clinicId)
      .select('id, name, whatsapp_app_id, whatsapp_api_key, whatsapp_number, whatsapp_display_name')
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update clinic WhatsApp configuration' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Test the configuration by making a simple API call to Gupshup
    try {
      const testResponse = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
        method: 'POST',
        headers: {
          'apikey': whatsappApiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          channel: 'whatsapp',
          source: whatsappNumber,
          destination: whatsappNumber, // Send to self for testing
          'src.name': whatsappDisplayName || 'Test',
          message: 'WhatsApp configuration test successful!'
        })
      });

      const testData = await testResponse.json();
      
      return res.status(200).json({ 
        success: true, 
        message: 'WhatsApp configuration updated successfully',
        clinic: {
          id: data.id,
          name: data.name,
          whatsapp_app_id: data.whatsapp_app_id,
          whatsapp_number: data.whatsapp_number,
          whatsapp_display_name: data.whatsapp_display_name
        },
        test_result: testData
      });

    } catch (testError) {
      // Configuration saved but test failed
      return res.status(200).json({ 
        success: true, 
        message: 'WhatsApp configuration saved but test failed. Please verify your credentials.',
        clinic: {
          id: data.id,
          name: data.name,
          whatsapp_app_id: data.whatsapp_app_id,
          whatsapp_number: data.whatsapp_number,
          whatsapp_display_name: data.whatsapp_display_name
        },
        test_error: testError.message
      });
    }

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 