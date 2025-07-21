import { supabase } from '../src/lib/supabase.js';
import { sendEmail } from './email-service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { name, email, phone, query } = req.body;
  if (!name || !email || !phone || !query) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // Insert into contact_queries table
  const { error: dbError } = await supabase.from('contact_queries').insert([
    {
      name,
      email,
      phone,
      query,
    },
  ]);
  if (dbError) {
    console.error('Supabase insert error:', dbError);
    return res.status(500).json({ success: false, error: dbError.message });
  }

  // Send email notification
  try {
    await sendEmail(
      'ashu15july@gmail.com',
      'New Contact Query',
      `<p>New contact query submitted:</p>
       <ul>
         <li><b>Name:</b> ${name}</li>
         <li><b>Email:</b> ${email}</li>
         <li><b>Phone:</b> ${phone}</li>
         <li><b>Query:</b> ${query}</li>
       </ul>`
    );
  } catch (emailError) {
    console.error('Email send error:', emailError);
    // Still return success, but log the error
  }

  return res.status(200).json({ success: true });
} 