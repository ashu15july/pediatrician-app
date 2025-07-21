import { supabase } from '../src/lib/supabase.js';
import { sendEmail } from './email-service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { name, email, clinic, phone, message } = req.body;
  if (!name || !email || !clinic || !phone) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // Insert into leads table
  const { error: dbError } = await supabase.from('leads').insert([
    {
      name,
      email,
      clinic_name: clinic,
      phone,
      message,
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
      'New Get Started Lead',
      `<p>New lead submitted:</p>
       <ul>
         <li><b>Name:</b> ${name}</li>
         <li><b>Email:</b> ${email}</li>
         <li><b>Clinic:</b> ${clinic}</li>
         <li><b>Phone:</b> ${phone}</li>
         <li><b>Message:</b> ${message || ''}</li>
       </ul>`
    );
  } catch (emailError) {
    console.error('Email send error:', emailError);
    // Still return success, but log the error
  }

  return res.status(200).json({ success: true });
} 