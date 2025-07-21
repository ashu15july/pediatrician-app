import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DocumentationPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <FileText className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">Documentation</h1>
        <p className="text-lg text-blue-700 mb-8">
          Explore guides, API references, and technical documentation for PediaCircle.
        </p>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-left">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Getting Started</h2>
          <ul className="list-disc pl-6 text-blue-700 space-y-2">
            <li>Account setup and onboarding</li>
            <li>API authentication and usage</li>
            <li>Integrating with your clinic systems</li>
            <li>Best practices and troubleshooting</li>
          </ul>
          <p className="text-blue-700 mt-6">Looking for something specific? <Link to='/helpcenter' className='text-blue-600 underline'>Visit our Help Center</Link> or <Link to='/contact' className='text-blue-600 underline'>contact support</Link>.</p>
        </div>
      </div>
    </PublicLayout>
  );
} 