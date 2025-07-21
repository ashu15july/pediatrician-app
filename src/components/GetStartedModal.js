import React, { useState, useEffect } from 'react';
import { X, Mail, User, Phone, Building2 } from 'lucide-react';

export default function GetStartedModal({ isOpen, onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    clinic: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSuccess(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch('/api/send-get-started', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send details');
      }
      setSuccess('Thank you! Your details have been submitted. We will contact you soon.');
      setForm({ name: '', email: '', clinic: '', phone: '', message: '' });
      // Close the modal after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to send details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative border border-blue-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-2 text-blue-700 flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-500" /> Get Started
        </h2>
        <p className="mb-6 text-gray-600">Fill out the form and we’ll reach out to onboard your clinic.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <div className="flex items-center border rounded-lg px-3">
              <User className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full py-2 outline-none bg-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="flex items-center border rounded-lg px-3">
              <Mail className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full py-2 outline-none bg-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
            <div className="flex items-center border rounded-lg px-3">
              <Building2 className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                name="clinic"
                value={form.clinic}
                onChange={handleChange}
                className="w-full py-2 outline-none bg-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="flex items-center border rounded-lg px-3">
              <Phone className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full py-2 outline-none bg-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none bg-transparent"
              rows={3}
              placeholder="Tell us about your clinic or any questions you have..."
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
} 