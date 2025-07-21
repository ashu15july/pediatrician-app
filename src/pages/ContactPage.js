import React, { useState } from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { Mail, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', query: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch('/api/send-contact-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send query');
      }
      setSuccess('Thank you! Your query has been submitted. We will contact you soon.');
      setForm({ name: '', email: '', phone: '', query: '' });
    } catch (err) {
      setError(err.message || 'Failed to send query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <Mail className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">Contact Us</h1>
        <p className="text-lg text-blue-700 mb-8">
          Have questions, feedback, or need support? We’re here to help!
        </p>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-left max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Get in Touch</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 outline-none bg-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 outline-none bg-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 outline-none bg-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Query</label>
              <textarea
                name="query"
                value={form.query}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 outline-none bg-transparent"
                rows={4}
                required
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
    </PublicLayout>
  );
} 