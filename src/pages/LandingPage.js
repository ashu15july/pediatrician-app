import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-emerald-100">
      {/* Header */}
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full">
        <div className="text-2xl font-extrabold text-blue-700 tracking-tight">PediaCircle</div>
        <a href="#get-started" className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold shadow hover:bg-blue-700 transition">Get Started</a>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-8 pb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold text-blue-800 mb-4 leading-tight animate-fade-in">
          AI-Powered Pediatric Clinic Management
        </h1>
        <p className="text-lg md:text-2xl text-blue-700 mb-8 max-w-2xl animate-fade-in delay-100">
          Streamline your workflow, enhance care, and get real-time AI clinical support. Secure, modern, and built for pediatricians.
        </p>
        <a href="#get-started" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-full text-xl font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 transition animate-fade-in delay-200">
          Request a Demo
        </a>
        {/* Decorative animated shapes */}
        <div className="absolute top-0 left-0 w-full h-64 pointer-events-none overflow-hidden">
          <div className="absolute left-1/4 top-10 w-32 h-32 bg-blue-200 rounded-full opacity-30 animate-float-slow" />
          <div className="absolute right-1/4 top-24 w-24 h-24 bg-emerald-200 rounded-full opacity-30 animate-float" />
        </div>
      </main>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="flex flex-col items-center text-center">
          <div className="bg-blue-100 text-blue-600 rounded-full p-4 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Secure Patient Records</h3>
          <p className="text-blue-700">All your patient data, vitals, and history in one secure, easy-to-access place.</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="bg-emerald-100 text-emerald-600 rounded-full p-4 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Smart Appointment Scheduling</h3>
          <p className="text-blue-700">Easily manage appointments, follow-ups, and reminders for every patient.</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="bg-yellow-100 text-yellow-600 rounded-full p-4 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m4 0h-1v-4h-1m-4 0h-1v-4h-1" /></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">AI Clinical Assistant</h3>
          <p className="text-blue-700">Get instant AI-powered feedback and suggestions on every visit note.</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="bg-pink-100 text-pink-600 rounded-full p-4 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 0V4m0 16v-4" /></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Growth & Vaccination Tracking</h3>
          <p className="text-blue-700">Visualize growth charts and manage vaccination schedules with ease.</p>
        </div>
      </section>

      {/* Demo/How It Works Section */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-800 mb-4">How It Works</h2>
          <p className="text-blue-700 mb-8">See how PediaCircle transforms your clinic workflow in just a few steps.</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="flex-1 bg-blue-50 rounded-xl shadow p-6 mb-6 md:mb-0">
              <h4 className="font-semibold text-blue-700 mb-2">1. Add a Patient</h4>
              <p className="text-blue-600">Quickly register new patients and record their details securely.</p>
            </div>
            <div className="flex-1 bg-emerald-50 rounded-xl shadow p-6 mb-6 md:mb-0">
              <h4 className="font-semibold text-emerald-700 mb-2">2. Schedule & Record Visits</h4>
              <p className="text-emerald-600">Book appointments, record vitals, and document every visit with ease.</p>
            </div>
            <div className="flex-1 bg-yellow-50 rounded-xl shadow p-6">
              <h4 className="font-semibold text-yellow-700 mb-2">3. Get AI Insights</h4>
              <p className="text-yellow-600">Let our AI assistant review notes and suggest follow-up questions or care tips.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 px-4 bg-gradient-to-r from-blue-50 to-emerald-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Trusted by clinics and pediatricians</h3>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-80">
            {/* Replace with real logos if available */}
            <span className="text-2xl font-bold text-blue-400">👩‍⚕️</span>
            <span className="text-2xl font-bold text-emerald-400">🧑‍⚕️</span>
            <span className="text-2xl font-bold text-yellow-400">🏥</span>
            <span className="text-2xl font-bold text-pink-400">👶</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 bg-white border-t border-blue-100 text-center text-blue-600 text-sm">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div>PediaCircle &copy; {new Date().getFullYear()}</div>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">About</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
} 