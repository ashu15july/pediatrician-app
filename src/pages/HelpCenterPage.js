import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpCenterPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <HelpCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">Help Center</h1>
        <p className="text-lg text-blue-700 mb-8">
          Find answers to common questions, troubleshooting tips, and guides for using PediaCircle.
        </p>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-left">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">How can we help you?</h2>
          <ul className="list-disc pl-6 text-blue-700 space-y-2">
            <li>Getting Started with PediaCircle</li>
            <li>Managing Patients and Appointments</li>
            <li>Billing and Reports</li>
            <li>Security and Privacy</li>
            <li>Contacting Support</li>
          </ul>
          <p className="text-blue-700 mt-6">Can’t find what you’re looking for? <Link to='/contact' className='text-blue-600 underline'>Contact us</Link> for further assistance.</p>
        </div>
      </div>
    </PublicLayout>
  );
} 