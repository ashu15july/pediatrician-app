import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">About PediaCircle</h1>
        <p className="text-lg text-blue-700 mb-8">
          PediaCircle is dedicated to empowering pediatricians with modern, AI-powered clinic management solutions. Our mission is to make pediatric care more efficient, insightful, and delightful for both doctors and families.
        </p>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-left">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Our Story</h2>
          <p className="text-blue-700 mb-4">Founded by a team of pediatricians and technologists, PediaCircle was born out of the need for a smarter, more intuitive way to manage clinics and care for children. We believe technology should simplify, not complicate, the lives of healthcare professionals.</p>
          <h2 className="text-2xl font-bold text-blue-700 mb-4 mt-8">Our Values</h2>
          <ul className="list-disc pl-6 text-blue-700 space-y-2">
            <li>Innovation in healthcare technology</li>
            <li>Security and privacy for every patient</li>
            <li>Empowering doctors and staff</li>
            <li>Delighting parents and families</li>
            <li>Continuous improvement and learning</li>
          </ul>
        </div>
      </div>
    </PublicLayout>
  );
} 