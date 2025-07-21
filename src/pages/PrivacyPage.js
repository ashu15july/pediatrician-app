import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8 mb-12">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">Privacy Policy</h1>
        <div className="text-gray-500 text-sm mb-6">Last updated: June 2024</div>
        <p className="text-lg text-blue-700 mb-6">Your privacy is important to us. This Privacy Policy explains how PediaCircle collects, uses, and protects your information.</p>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">Information We Collect</h2>
        <ul className="list-disc ml-6 text-gray-700 mb-4">
          <li>Personal information you provide (name, email, phone, etc.)</li>
          <li>Usage data and analytics</li>
          <li>Cookies and similar technologies</li>
        </ul>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">How We Use Information</h2>
        <ul className="list-disc ml-6 text-gray-700 mb-4">
          <li>To provide and improve our services</li>
          <li>To communicate with you</li>
          <li>To ensure security and prevent fraud</li>
        </ul>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">Your Rights</h2>
        <ul className="list-disc ml-6 text-gray-700 mb-4">
          <li>Access, update, or delete your information</li>
          <li>Opt out of marketing communications</li>
        </ul>
        <p className="text-gray-600 mt-8">For questions about this policy, contact us at <a href="mailto:support@pediacircle.com" className="text-blue-600 underline">support@pediacircle.com</a>.</p>
      </div>
    </PublicLayout>
  );
} 