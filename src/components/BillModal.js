import React, { useState } from 'react';
import { Mail, CheckCircle, Receipt, X, User, Calendar, Clock, CreditCard, IndianRupee } from 'lucide-react';

const ITEM_TYPES = [
  'Consultation',
  'Medicine',
  'Test',
  'Other',
];
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

const BillModal = ({ appointment, patient, doctor, clinic, onClose, bill: initialBill, readOnly = false }) => {
  const clinicInfo = clinic || {};
  const doctorInfo = doctor || appointment.doctor || {};
  const patientInfo = patient || appointment.patient || {};
  const visitDate = appointment.date;
  const visitTime = appointment.time;

  // Editable items state
  const [items, setItems] = useState(initialBill?.items || [
    { type: 'Consultation', description: 'Consultation Fee', quantity: 0, unitPrice: 0, total: 0 },
    { type: 'Medicine', description: 'Paracetamol 250mg', quantity: 0, unitPrice: 0, total: 0 },
    { type: 'Test', description: 'Blood Test (CBC)', quantity: 0, unitPrice: 0, total: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(initialBill?.payment_method || '');
  const [transactionNumber, setTransactionNumber] = useState(initialBill?.transaction_number || '');
  const [isPaid, setIsPaid] = useState(initialBill?.status === 'paid');
  const [billId, setBillId] = useState(initialBill?.id || null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(null);
  const [emailError, setEmailError] = useState(null);

  // Update total when quantity or unit price changes
  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      let newItem = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : Number(item.quantity);
        const unitPrice = field === 'unitPrice' ? Number(value) : Number(item.unitPrice);
        newItem.total = quantity * unitPrice;
      }
      return newItem;
    }));
  };

  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { type: 'Other', description: '', quantity: 0, unitPrice: 0, total: 0 },
    ]);
  };

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  const handleSaveBill = async () => {
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await fetch('/api/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          appointmentId: appointment.id,
          patientId: patientInfo.id,
          doctorId: doctorInfo.id,
          clinicId: clinicInfo.id,
          items,
          total: grandTotal,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save bill');
      }
      setSaveSuccess('Bill saved successfully!');
      setBillId(data.billId);
    } catch (err) {
      setSaveError(err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await fetch('/api/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          billId,
          markPaid: true,
          payment_method: paymentMethod,
          transaction_number: transactionNumber,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark bill as paid');
      }
      setSaveSuccess('Bill marked as paid!');
      setIsPaid(true);
    } catch (err) {
      setSaveError(err.message || 'Failed to mark bill as paid');
    } finally {
      setSaving(false);
    }
  };

  const handleSendBillEmail = async () => {
    setEmailSending(true);
    setEmailSuccess(null);
    setEmailError(null);
    try {
      const res = await fetch('/api/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-email',
          billId,
          email: patientInfo.email || patientInfo.guardian_email
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send bill email');
      }
      setEmailSuccess('Bill sent to email successfully!');
    } catch (err) {
      setEmailError(err.message || 'Failed to send bill email');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-0 relative border border-blue-100">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-8 py-6 rounded-t-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-500 text-white shadow-md">
          <div className="flex items-center gap-4">
            {clinicInfo.logo ? (
              <img src={clinicInfo.logo} alt="Clinic Logo" className="h-14 w-14 rounded-full object-cover border-2 border-white shadow" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-blue-700 text-3xl font-bold border-2 border-white shadow"><Receipt className="w-8 h-8" /></div>
            )}
            <div>
              <div className="font-extrabold text-2xl tracking-tight">{clinicInfo.name || 'Clinic Name'}</div>
              <div className="text-blue-100 text-xs font-medium">{clinicInfo.address || ''}</div>
              <div className="text-blue-200 text-xs">{clinicInfo.phone || ''}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-lg">{doctorInfo.full_name || 'Doctor Name'}</div>
            <div className="text-blue-100 text-xs">{doctorInfo.specialization || 'Pediatrics'}</div>
            <div className="text-blue-200 text-xs">{doctorInfo.phone || ''}</div>
          </div>
        </div>
        {/* Patient & Visit Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-3 text-blue-900 text-sm font-medium">
            <User className="w-4 h-4 text-blue-400" /> {patientInfo.name}
            <span className="mx-2 text-blue-300">|</span>
            <span>Age: {patientInfo.age}</span>
            <span className="mx-2 text-blue-300">|</span>
            <span>Gender: {patientInfo.gender}</span>
            <span className="mx-2 text-blue-300">|</span>
            <span>Phone: {patientInfo.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-blue-900 text-sm font-medium">
            <Calendar className="w-4 h-4 text-blue-400" /> {visitDate}
            <Clock className="w-4 h-4 text-blue-400 ml-4" /> {visitTime}
          </div>
        </div>
        {/* Bill Items Table */}
        <div className="px-8 pt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-blue-800 font-bold text-lg">Bill Items</h4>
            <button
              onClick={handleAddItem}
              className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition shadow"
              type="button"
              disabled={isPaid || readOnly}
            >
              + Add Item
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl shadow border border-blue-100 bg-white">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-blue-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-blue-700">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-blue-700">Description</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-700">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold text-blue-700">Unit Price</th>
                  <th className="px-3 py-2 text-right font-semibold text-blue-700">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100 transition'}>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1 w-full bg-white"
                        value={item.type}
                        onChange={e => handleItemChange(idx, 'type', e.target.value)}
                        disabled={isPaid || readOnly}
                      >
                        {ITEM_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1 w-full bg-white"
                        value={item.description}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Description"
                        disabled={isPaid || readOnly}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 w-16 text-center bg-white"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        disabled={isPaid || readOnly}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="border rounded px-2 py-1 w-20 text-right bg-white"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                        disabled={isPaid || readOnly}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">₹{(item.total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 font-bold text-lg px-2"
                        type="button"
                        title="Remove item"
                        disabled={isPaid || readOnly}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Grand Total */}
        <div className="flex justify-end items-center px-8 py-6 bg-blue-50 border-t border-blue-100 mt-2">
          <div className="text-2xl font-bold text-blue-800 flex items-center gap-2"><IndianRupee className="w-6 h-6 text-blue-700" /> Grand Total: ₹{grandTotal.toFixed(2)}</div>
        </div>
        {/* Payment Section */}
        <div className="px-8 pb-6">
          <h4 className="text-blue-800 font-bold text-lg mb-2">Payment</h4>
          {isPaid ? (
            <div className="text-green-700 font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full">Bill Paid</span>
              {paymentMethod && <span>via {paymentMethod.toUpperCase()}</span>}
              {transactionNumber && <span>Txn: {transactionNumber}</span>}
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
              <div className="flex items-center gap-4">
                {PAYMENT_METHODS.map(pm => (
                  <label key={pm.value} className="inline-flex items-center gap-1 cursor-pointer px-3 py-1 rounded-full border border-blue-200 bg-white shadow-sm hover:bg-blue-50 transition">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={pm.value}
                      checked={paymentMethod === pm.value}
                      onChange={e => setPaymentMethod(e.target.value)}
                      disabled={isPaid || readOnly}
                    />
                    <span>{pm.label}</span>
                  </label>
                ))}
              </div>
              {(paymentMethod === 'card' || paymentMethod === 'upi') && (
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-64 bg-white"
                  placeholder={paymentMethod === 'card' ? 'Card Transaction Number' : 'UPI Transaction Number'}
                  value={transactionNumber}
                  onChange={e => setTransactionNumber(e.target.value)}
                  disabled={isPaid || readOnly}
                />
              )}
            </div>
          )}
        </div>
        {/* Action Buttons */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-blue-100 px-8 py-4 flex flex-wrap gap-3 justify-end rounded-b-3xl z-10 shadow-lg">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-blue-600 text-blue-700 font-semibold bg-white hover:bg-blue-50 transition shadow"
            type="button"
            disabled={saving}
          >
            <X className="w-5 h-5" /> Close
          </button>
          {!isPaid && !readOnly && (
            <>
              <button
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow"
                onClick={handleSaveBill}
                type="button"
                disabled={saving}
              >
                <Receipt className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Bill'}
              </button>
              {billId && paymentMethod && (
                <button
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold transition shadow ${isPaid ? 'bg-green-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  onClick={handleMarkPaid}
                  type="button"
                  disabled={saving || !paymentMethod || (["card","upi"].includes(paymentMethod) && !transactionNumber) || isPaid}
                >
                  <CheckCircle className="w-5 h-5" /> {isPaid ? 'Paid' : (saving ? 'Marking...' : 'Mark as Paid')}
                </button>
              )}
            </>
          )}
          {billId && (patientInfo.email || patientInfo.guardian_email) && (
            <button
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
              onClick={handleSendBillEmail}
              disabled={emailSending}
              title="Send bill to email"
              type="button"
            >
              <Mail className="w-5 h-5" /> {emailSending ? 'Sending...' : 'Send Email'}
            </button>
          )}
        </div>
        {emailError && <div className="text-red-600 font-semibold mb-2 text-right px-8">{emailError}</div>}
        {emailSuccess && <div className="text-green-600 font-semibold mb-2 text-right px-8">{emailSuccess}</div>}
      </div>
    </div>
  );
};

export default BillModal; 