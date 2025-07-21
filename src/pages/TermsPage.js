import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8 mb-12">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">Terms of Service</h1>
        <div className="text-gray-500 text-sm mb-6">Last updated: June 2024</div>
        <p className="text-lg text-blue-700 mb-6">By using PediaCircle, you agree to the following terms and conditions. Please read them carefully.</p>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">Use of Service</h2>
        <ul className="list-disc ml-6 text-gray-700 mb-4">
          <li>You must be at least 18 years old to use this service.</li>
          <li>Do not misuse our services or attempt to access them using unauthorized means.</li>
        </ul>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">Account Responsibilities</h2>
        <ul className="list-disc ml-6 text-gray-700 mb-4">
          <li>You are responsible for maintaining the confidentiality of your account.</li>
          <li>Notify us immediately of any unauthorized use of your account.</li>
        </ul>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">Limitation of Liability</h2>
        <ul className="list-disc ml-6 text-gray-700 mb-4">
          <li>PediaCircle is provided "as is" without warranties of any kind.</li>
          <li>We are not liable for any damages resulting from the use of our service.</li>
        </ul>
        <p className="text-gray-600 mt-8">For questions about these terms, contact us at <a href="mailto:support@pediacircle.com" className="text-blue-600 underline">support@pediacircle.com</a>.</p>
      </div>
    </PublicLayout>
  );
} 