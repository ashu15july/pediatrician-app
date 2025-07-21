import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { BookOpen } from 'lucide-react';

export default function BlogPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <BookOpen className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">PediaCircle Blog</h1>
        <p className="text-lg text-blue-700 mb-8">
          Insights, tips, and stories from the world of pediatric care, technology, and clinic management.
        </p>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-left">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Latest Articles</h2>
          <p className="text-blue-700">Stay tuned! Our blog will soon feature expert advice, product updates, and inspiring stories from pediatricians and parents.</p>
        </div>
      </div>
    </PublicLayout>
  );
} 