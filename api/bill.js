const emailService = require('./email-service');
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

function generateBillPDF({ bill, patient, doctor, clinic }) {
  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  const pageWidth = doc.page.width;
  let y = 0;
  
  // Ensure all objects exist and have default values
  const safeClinic = clinic || {};
  const safeDoctor = doctor || {};
  const safePatient = patient || {};
  const safeBill = bill || { items: [] };
  
  // Header background
  doc.rect(0, 0, pageWidth, 110).fill('#374151');
  
  // Logo
  if (safeClinic.logo) {
    try {
      doc.image(safeClinic.logo, 32, 24, { width: 48, height: 48 });
    } catch (e) {
      // Fallback to default logo if image fails to load
      doc.circle(56, 48, 24).fill('#fff').stroke('#e5e7eb');
      doc.fontSize(28).fillColor('#374151').font('Helvetica-Bold').text('🧾', 40, 32, { width: 32, align: 'center' });
    }
  } else {
    doc.circle(56, 48, 24).fill('#fff').stroke('#e5e7eb');
    doc.fontSize(28).fillColor('#374151').font('Helvetica-Bold').text('🧾', 40, 32, { width: 32, align: 'center' });
  }
  
  // Clinic name and address
  doc.fontSize(22).fillColor('#fff').font('Helvetica-Bold').text(safeClinic.name || 'Clinic Name', 90, 32, { continued: false });
  doc.fontSize(10).fillColor('#e5e7eb').font('Helvetica').text(safeClinic.address || '', 90, 60, { width: 350 });
  doc.text(safeClinic.phone || '', 90, 75);
  
  // Doctor info (right side)
  doc.fontSize(12).fillColor('#fff').font('Helvetica-Bold').text(safeDoctor.full_name || 'Dr. Name', pageWidth - 220, 32, { width: 200, align: 'right' });
  doc.fontSize(10).fillColor('#e5e7eb').font('Helvetica').text(safeDoctor.qualification || '', pageWidth - 220, 50, { width: 200, align: 'right' });
  doc.text(safeDoctor.specialization || '', pageWidth - 220, 65, { width: 200, align: 'right' });
  y = 120;
  // Visit date, patient info, bill number
  doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold').text('Visit Date:', 40, y);
  doc.font('Helvetica').fillColor('#374151').text(formatDate(safeBill.created_at), 120, y);
  y += 20;
  doc.font('Helvetica-Bold').fillColor('#111827').text('Billed To:', 40, y);
  doc.font('Helvetica').fillColor('#374151').text(`${safePatient.name || 'Patient Name'} | ${safePatient.gender || ''} | ${safePatient.age || ''} | ${safePatient.phone || safePatient.guardian_phone || ''} | ${safePatient.patient_code || ''}`, 120, y);
  y += 30;
  // Table header
  doc.moveTo(40, y).lineTo(pageWidth - 40, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  y += 10;
  doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold');
  const x0 = 48, x1 = x0 + 36, x2 = x1 + 170, x3 = x2 + 36, x4 = x3 + 70, x5 = x4 + 60;
  doc.text('S. No', x0, y, { width: 36 });
  doc.text('Service', x1, y, { width: 170 });
  doc.text('Qty', x2, y, { width: 36, align: 'center' });
  doc.text('Amount', x3, y, { width: 70, align: 'right' });
  doc.text('Discount', x4, y, { width: 60, align: 'right' });
  doc.text('Total', x5, y, { width: 60, align: 'right' });
  y += 16;
  doc.moveTo(40, y).lineTo(pageWidth - 40, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  y += 6;
  // Table rows
  doc.font('Helvetica').fillColor('#111827').fontSize(9);
  let subTotal = 0;
  
  // Ensure items is an array and handle empty case
  const items = Array.isArray(safeBill.items) ? safeBill.items : [];
  
  if (items.length === 0) {
    // Show a message if no items
    doc.text('No items', x1, y, { width: 170 });
    y += 18;
  } else {
    items.forEach((item, idx) => {
      const safeItem = item || {};
      const amount = Number(safeItem.unitPrice ?? safeItem.unit_price ?? 0) * Number(safeItem.quantity ?? 0);
      const discount = Number(safeItem.discount ?? 0);
      const total = amount - discount;
      subTotal += total;
      doc.text(String(idx + 1).padStart(2, '0'), x0, y, { width: 36 });
      doc.text(safeItem.description || 'Service', x1, y, { width: 170 });
      doc.text(String(safeItem.quantity ?? 0).padStart(2, '0'), x2, y, { width: 36, align: 'center' });
      doc.text(`Rs. ${Number(safeItem.unitPrice ?? safeItem.unit_price ?? 0).toFixed(0)}`, x3, y, { width: 70, align: 'right' });
      doc.text(`${discount}`, x4, y, { width: 60, align: 'right' });
      doc.text(`Rs. ${total.toFixed(0)}`, x5, y, { width: 60, align: 'right' });
      y += 18;
    });
  }
  // Sub-total
  doc.font('Helvetica').fillColor('#374151').fontSize(9);
  doc.text('Sub-Total', x1, y, { width: 170 });
  doc.text(subTotal.toFixed(0), x5, y, { width: 60, align: 'right' });
  y += 20;
  // Grand Total row
  doc.rect(40, y, pageWidth - 80, 30).fill('#f3f4f6');
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Grand Total', x1, y + 8);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(`Rs. ${subTotal.toFixed(0)}`, x5, y + 8, { width: 60, align: 'right' });
  y += 36;
  doc.end();
  return doc;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  try {
    if (action === 'save') {
      // Save bill logic (from save-bill.js)
      const {
        appointmentId, patientId, doctorId, clinicId, items, total,
        payment_method, transaction_number, paid_at, billId, markPaid
      } = req.body;
      // If billId and markPaid are provided, update the bill as paid
      if (billId && markPaid) {
        const { error: updateError } = await supabase
          .from('bills')
          .update({
            status: 'paid',
            payment_method,
            transaction_number,
            paid_at: paid_at || new Date().toISOString(),
          })
          .eq('id', billId);
        if (updateError) throw updateError;
        return res.status(200).json({ success: true, billId });
      }
      // Create new bill
      if (!appointmentId || !patientId || !doctorId || !clinicId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      // Insert bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert([
          {
            appointment_id: appointmentId,
            patient_id: patientId,
            doctor_id: doctorId,
            clinic_id: clinicId,
            total_amount: total,
            status: payment_method ? 'paid' : 'unpaid',
            payment_method: payment_method || null,
            transaction_number: transaction_number || null,
            paid_at: payment_method ? (paid_at || new Date().toISOString()) : null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      if (billError) throw billError;
      // Insert bill items
      const billItems = items.map(item => ({
        bill_id: bill.id,
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
      }));
      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems);
      if (itemsError) throw itemsError;
      return res.status(200).json({ success: true, billId: bill.id });
    } else if (action === 'send-email') {
      // Send bill email logic (from send-bill-email.js)
      const { billId, email } = req.body;
      if (!billId || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      // Fetch bill, patient, doctor, clinic
      const { data: bill, error: billError } = await supabase.from('bills').select('*').eq('id', billId).single();
      if (billError) {
        console.error('Bill fetch error:', billError);
        return res.status(404).json({ error: 'Bill not found' });
      }
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      
      // Fetch bill items
      const { data: billItems, error: billItemsError } = await supabase.from('bill_items').select('*').eq('bill_id', billId);
      if (billItemsError) {
        console.error('Bill items fetch error:', billItemsError);
        return res.status(404).json({ error: 'Bill items not found' });
      }
      bill.items = billItems.map(item => ({
        type: item.type || '',
        description: item.description || '',
        quantity: item.quantity ?? 0,
        unitPrice: item.unit_price ?? 0,
        total: item.total ?? 0,
      }));
      const { data: patient, error: patientError } = await supabase.from('patients').select('*').eq('id', bill.patient_id).single();
      if (patientError) {
        console.error('Patient fetch error:', patientError);
        return res.status(404).json({ error: 'Patient not found' });
      }
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      
      const { data: doctor, error: doctorError } = await supabase.from('users').select('*').eq('id', bill.doctor_id).single();
      if (doctorError) {
        console.error('Doctor fetch error:', doctorError);
        return res.status(404).json({ error: 'Doctor not found' });
      }
      if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
      
      const { data: clinic, error: clinicError } = await supabase.from('clinics').select('*').eq('id', bill.clinic_id).single();
      if (clinicError) {
        console.error('Clinic fetch error:', clinicError);
        return res.status(404).json({ error: 'Clinic not found' });
      }
      if (!clinic) return res.status(404).json({ error: 'Clinic not found' });
      // Generate PDF
      let pdfBuffer;
      try {
        const pdfDoc = generateBillPDF({ bill, patient, doctor, clinic });
        pdfBuffer = await streamToBuffer(pdfDoc);
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error('Generated PDF buffer is empty');
        }
      } catch (pdfError) {
        console.error('PDF Generation Error:', pdfError);
        throw new Error(`Failed to generate PDF: ${pdfError.message}`);
      }
      // Send email
      const subject = `Bill for ${patient.name || 'Patient'} - ${clinic.name || 'Clinic'}`;
      const emailBody = `Hi,\n\nPlease find attached the bill for your recent visit.\n\nRegards,\n${clinic.name || 'Clinic'}`;
      const result = await emailService.sendEmail(
        email,
        subject,
        emailBody,
        [
          {
            content: pdfBuffer.toString('base64'),
            filename: `Bill_${(patient.name || 'Patient').replace(/ /g, '_')}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          }
        ]
      );
      if (!result.success) {
        return res.status(500).json({ error: result.error || 'Failed to send email' });
      }
      return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    console.error('Bill API Error:', err);
    console.error('Request body:', req.body);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 