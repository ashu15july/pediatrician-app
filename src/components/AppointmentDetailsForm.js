import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const AppointmentDetailsForm = ({ appointment, onClose, onUpdated }) => {
  const [notes, setNotes] = useState(appointment.notes || '');
  const [vaccination, setVaccination] = useState(appointment.vaccination || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ notes, vaccination })
        .eq('id', appointment.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Edit Appointment Details</h2>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          className="w-full border rounded p-2"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Vaccination Details</label>
        <textarea
          className="w-full border rounded p-2"
          rows={2}
          value={vaccination}
          onChange={e => setVaccination(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default AppointmentDetailsForm; 