import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { Shield, Lock, Users, Cloud, FileText, Eye } from 'lucide-react';

export default function SecurityPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">Security & Compliance</h1>
        <p className="text-lg text-blue-700">Your data is safe, private, and always under your control.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Shield className="w-10 h-10 text-blue-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">HIPAA-Compliant</h3>
          <p className="text-blue-700">We follow HIPAA and healthcare data regulations to ensure your clinic and patient data is always protected.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Lock className="w-10 h-10 text-emerald-600 mb-4" />
          <h3 className="text-xl font-bold mb-2">End-to-End Encryption</h3>
          <p className="text-blue-700">All data is encrypted in transit and at rest using industry-standard protocols.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Users className="w-10 h-10 text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Role-Based Access</h3>
          <p className="text-blue-700">Only authorized users can access sensitive information. Permissions are strictly enforced for every role.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Cloud className="w-10 h-10 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">Secure Cloud Hosting</h3>
          <p className="text-blue-700">Hosted on secure, compliant cloud infrastructure with regular security audits and monitoring.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <FileText className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Audit Logs</h3>
          <p className="text-blue-700">Every action is logged and auditable, so you always know who accessed or changed data.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Eye className="w-10 h-10 text-pink-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Privacy by Design</h3>
          <p className="text-blue-700">We never share your data. Privacy and security are built into every feature from day one.</p>
        </div>
      </div>
    </PublicLayout>
  );
} 