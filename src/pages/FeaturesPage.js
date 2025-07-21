import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { Calendar, Shield, Brain, TrendingUp, Zap, Award, Users, Heart, Mail, MessageCircle } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">All-in-One Pediatric Clinic Features</h1>
        <p className="text-lg text-blue-700">Everything you need to run a modern, efficient, and patient-friendly pediatric practice.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Brain className="w-10 h-10 text-purple-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">AI Clinical Assistant</h3>
          <p className="text-blue-700">Get instant, AI-powered feedback and suggestions on every visit note, helping doctors make informed decisions and improve care quality.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Calendar className="w-10 h-10 text-blue-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Smart Scheduling</h3>
          <p className="text-blue-700">Easily manage appointments, follow-ups, and reminders for every patient. Avoid conflicts and keep your clinic running smoothly.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Shield className="w-10 h-10 text-emerald-600 mb-4" />
          <h3 className="text-xl font-bold mb-2">Secure Patient Records</h3>
          <p className="text-blue-700">All patient data, vitals, and history are stored securely with encryption and role-based access control. HIPAA-compliant by design.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <TrendingUp className="w-10 h-10 text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Growth & Vaccination Tracking</h3>
          <p className="text-blue-700">Visualize growth charts, track developmental milestones, and manage vaccination schedules with automated reminders.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Zap className="w-10 h-10 text-pink-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Automated Reminders</h3>
          <p className="text-blue-700">Send appointment, vaccination, and follow-up reminders automatically via email and WhatsApp to reduce no-shows and improve compliance.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Award className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Professional Reports</h3>
          <p className="text-blue-700">Generate beautiful, comprehensive reports for patients, parents, and regulatory compliance. Export as PDF or send via email.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Users className="w-10 h-10 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">Role-based Access</h3>
          <p className="text-blue-700">Control who can view, edit, or manage different parts of the clinic. Separate roles for doctors, admins, and support staff.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
          <Mail className="w-10 h-10 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Communication</h3>
          <p className="text-blue-700">Send bills, reports, and reminders via email and WhatsApp directly from the platform. Keep parents informed and engaged.</p>
        </div>
      </div>
    </PublicLayout>
  );
} 