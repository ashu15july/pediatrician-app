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
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 