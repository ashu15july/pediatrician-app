import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { Star } from 'lucide-react';

export default function CareersPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">Careers at PediaCircle</h1>
        <p className="text-lg text-blue-700 mb-8">
          Join our mission to transform pediatric care with technology. We’re always looking for passionate, talented people!
        </p>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-left">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Open Positions</h2>
          <p className="text-blue-700">We currently do not have any open positions. Please check back soon or send your resume to <a href='mailto:careers@pediacircle.com' className='text-blue-600 underline'>careers@pediacircle.com</a> for future opportunities.</p>
        </div>
      </div>
    </PublicLayout>
  );
} 