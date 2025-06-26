const emailService = require('./email-service');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Missing "to" email address' });
  }

  const subject = 'Test Email from Pediatrician App (SendGrid)';
  const html = `<h2>This is a test email sent via SendGrid!</h2><p>If you received this, your integration works 🎉</p>`;

  try {
    const result = await emailService.sendEmail(to, subject, html);
    if (result.success) {
      return res.status(200).json({ success: true, message: 'Test email sent!', messageId: result.messageId });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}; 