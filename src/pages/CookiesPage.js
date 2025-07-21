import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

export default function CookiesPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8 mb-12">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">Cookies Policy</h1>
        <div className="text-gray-500 text-sm mb-6">Last updated: June 2024</div>
        <p className="text-lg text-blue-700 mb-6">This Cookies Policy explains how PediaCircle uses cookies and similar technologies to recognize you when you visit our website.</p>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">What Are Cookies?</h2>
        <p className="text-gray-700 mb-4">Cookies are small data files placed on your device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information.</p>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">How We Use Cookies</h2>
        <ul className="list-disc ml-6 text-gray-700 mb-4">
          <li>To remember your preferences and settings</li>
          <li>To analyze site traffic and usage</li>
          <li>To improve user experience</li>
        </ul>
        <h2 className="text-2xl font-semibold text-blue-700 mt-6 mb-2">Managing Cookies</h2>
        <p className="text-gray-700 mb-4">You can control and manage cookies using your browser settings. Please note that removing or blocking cookies may impact your user experience.</p>
        <p className="text-gray-600 mt-8">For questions about this policy, contact us at <a href="mailto:support@pediacircle.com" className="text-blue-600 underline">support@pediacircle.com</a>.</p>
      </div>
    </PublicLayout>
  );
} 