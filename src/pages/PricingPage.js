import React from 'react';
import PublicLayout from '../layouts/PublicLayout';
import { CheckCircle, Star, Users, Award, Shield, Zap } from 'lucide-react';

export default function PricingPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-blue-700">Start with a free trial. Upgrade as your clinic grows. No hidden fees.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
        {/* Free Trial */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border-2 border-blue-200">
          <Star className="w-10 h-10 text-yellow-400 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Free Trial</h3>
          <div className="text-3xl font-extrabold text-blue-700 mb-2">$0</div>
          <p className="text-blue-700 mb-4">Try all features for 14 days. No credit card required.</p>
          <ul className="text-blue-700 text-left space-y-2 mb-6">
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Full access to all features</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Unlimited patients & appointments</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Email/WhatsApp reminders</li>
          </ul>
          <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-full font-bold shadow hover:scale-105 transition">Start Free Trial</button>
        </div>
        {/* Standard Clinic Plan */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border-2 border-emerald-200 scale-105">
          <Users className="w-10 h-10 text-blue-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Clinic Plan</h3>
          <div className="text-3xl font-extrabold text-emerald-700 mb-2">$49<span className="text-lg font-normal">/mo</span></div>
          <p className="text-blue-700 mb-4">For individual clinics and pediatricians.</p>
          <ul className="text-blue-700 text-left space-y-2 mb-6">
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />All Free Trial features</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Role-based access for staff</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Growth & vaccination tracking</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Professional PDF reports</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Priority email support</li>
          </ul>
          <button className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-full font-bold shadow hover:scale-105 transition">Get Started</button>
        </div>
        {/* Enterprise Plan */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border-2 border-purple-200">
          <Award className="w-10 h-10 text-purple-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
          <div className="text-3xl font-extrabold text-purple-700 mb-2">Custom</div>
          <p className="text-blue-700 mb-4">For hospitals, groups, and large practices.</p>
          <ul className="text-blue-700 text-left space-y-2 mb-6">
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />All Clinic Plan features</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Custom integrations & API</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Dedicated account manager</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />Onboarding & training</li>
            <li><CheckCircle className="inline w-5 h-5 mr-2 text-emerald-500" />SLA & compliance support</li>
          </ul>
          <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-bold shadow hover:scale-105 transition">Contact Sales</button>
        </div>
      </div>
      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-blue-800 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6 text-left">
          <div>
            <h4 className="font-semibold text-blue-700 mb-1">Is there a free trial?</h4>
            <p className="text-blue-700">Yes! You can try all features free for 14 days, no credit card required.</p>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-1">Can I cancel anytime?</h4>
            <p className="text-blue-700">Absolutely. There are no contracts or hidden fees. Cancel anytime from your dashboard.</p>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-1">Is my data secure?</h4>
            <p className="text-blue-700">Yes. We use industry-standard encryption and comply with healthcare data regulations.</p>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-1">Do you offer support?</h4>
            <p className="text-blue-700">Yes! Our support team is available via email and chat to help you anytime.</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
} 