import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { Code, Server, User, Calendar, Receipt, Mail, Lock } from 'lucide-react';

export default function ApiPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">Developer API</h1>
        <p className="text-lg text-blue-700">Integrate PediaCircle with your own systems using our secure, RESTful API.</p>
      </div>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 mb-12">
        <div className="flex items-center gap-4 mb-6">
          <Code className="w-10 h-10 text-blue-500" />
          <h2 className="text-2xl font-bold text-blue-800">API Endpoints</h2>
        </div>
        <ul className="space-y-6 text-left">
          <li>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-6 h-6 text-emerald-500" />
              <span className="font-semibold text-blue-700">Patients</span>
            </div>
            <div className="ml-8 text-blue-700 text-sm">
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">GET /api/patients</span> - List all patients</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">POST /api/patients</span> - Add a new patient</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">GET /api/patients/:id</span> - Get patient details</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">PUT /api/patients/:id</span> - Update patient</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">DELETE /api/patients/:id</span> - Delete patient</div>
            </div>
          </li>
          <li>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-6 h-6 text-blue-500" />
              <span className="font-semibold text-blue-700">Appointments</span>
            </div>
            <div className="ml-8 text-blue-700 text-sm">
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">GET /api/appointments</span> - List all appointments</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">POST /api/appointments</span> - Schedule a new appointment</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">GET /api/appointments/:id</span> - Get appointment details</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">PUT /api/appointments/:id</span> - Update appointment</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">DELETE /api/appointments/:id</span> - Cancel appointment</div>
            </div>
          </li>
          <li>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-6 h-6 text-purple-500" />
              <span className="font-semibold text-blue-700">Billing</span>
            </div>
            <div className="ml-8 text-blue-700 text-sm">
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">GET /api/bills</span> - List all bills</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">POST /api/bills</span> - Create a new bill</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">GET /api/bills/:id</span> - Get bill details</div>
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">PUT /api/bills/:id</span> - Update bill</div>
            </div>
          </li>
          <li>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-6 h-6 text-pink-500" />
              <span className="font-semibold text-blue-700">Reminders</span>
            </div>
            <div className="ml-8 text-blue-700 text-sm">
              <div><span className="font-mono bg-blue-50 px-2 py-1 rounded">POST /api/reminders</span> - Send a reminder (email/WhatsApp)</div>
            </div>
          </li>
        </ul>
      </div>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          <Lock className="w-8 h-8 text-blue-500" />
          <h2 className="text-2xl font-bold text-blue-800">Authentication</h2>
        </div>
        <p className="text-blue-700 mb-4">All API requests require authentication using a secure API key. Please contact support to request access.</p>
        <div className="flex items-center gap-4 mb-6">
          <Server className="w-8 h-8 text-emerald-500" />
          <h2 className="text-2xl font-bold text-blue-800">RESTful Design</h2>
        </div>
        <p className="text-blue-700">Our API follows RESTful principles for easy integration with your clinic’s systems. All responses are in JSON format.</p>
      </div>
    </PublicLayout>
  );
} 