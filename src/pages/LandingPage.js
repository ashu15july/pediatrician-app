import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Shield,
  Brain,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Heart,
  Zap,
  Award,
  ChevronRight,
  Play,
  Stethoscope,
  Baby,
  Syringe,
  Smile,
  UserPlus,
  Hospital,
  BookOpen,
  Sun,
  Cloud,
  Moon,
  X,
  Home
} from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import GetStartedModal from '../components/GetStartedModal';

// Simple CountUp component
function CountUp({ end, duration = 1.5, className = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration * 60);
    let frame;
    function animate() {
      start += increment;
      if (start < end) {
        setCount(Math.floor(start));
        frame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    }
    animate();
    return () => cancelAnimationFrame(frame);
  }, [end, duration]);
  return <span className={className}>{count.toLocaleString()}</span>;
}

export default function LandingPage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 overflow-hidden">
      {/* Animated Background Elements */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
          100% { transform: translateY(0px) scale(1); }
        }
        .animate-blob { animation: float 8s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes hero-float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }
        .hero-float { animation: hero-float 3.5s ease-in-out infinite; }
      `}</style>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            PediaCircle
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <Home className="w-5 h-5 mr-1" /> Home
          </Link>
          <Link
            to="/superadmin-login"
            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Admin Login
          </Link>
          <a
            href="#get-started"
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            onClick={e => { e.preventDefault(); setIsGetStartedOpen(true); }}
          >
            Get Started
          </a>
        </div>
      </header>

      {/* Modern Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-8 pb-24">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          {/* Left: Text & CTA */}
          <div className="flex flex-col items-start md:items-start text-left space-y-6" data-aos="fade-right">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-2 animate-fade-in">
              <Star className="w-4 h-4 mr-2 animate-bounce" />
              Trusted by 100+ Pediatric Clinics
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent animate-gradient-x">
                Modern Pediatric Clinic Platform
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 max-w-xl mb-2">
              AI-powered management, beautiful reports, and seamless patient care. Built for pediatricians, loved by parents.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
              {/* Remove Start Free Trial button and place Watch Demo here */}
              <button
                onClick={() => setIsVideoPlaying(true)}
                className="flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                <Play className="w-5 h-5 mr-2 animate-pulse" />
                Watch Demo
              </button>
            </div>
            {/* Quick stats under CTA */}
            <div className="flex gap-8 mt-6">
              <div className="flex items-center gap-2">
                <Smile className="w-6 h-6 text-emerald-500 hero-float" />
                <span className="font-bold text-blue-700 text-lg"><CountUp end={10000} duration={1.5} />+</span>
                <span className="text-gray-500 text-sm">Patients</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-500 hero-float" />
                <span className="font-bold text-emerald-700 text-lg"><CountUp end={50000} duration={1.5} />+</span>
                <span className="text-gray-500 text-sm">Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-purple-500 hero-float" />
                <span className="font-bold text-purple-700 text-lg"><CountUp end={99.9} duration={1.5} />%</span>
                <span className="text-gray-500 text-sm">Uptime</span>
              </div>
            </div>
          </div>
          {/* Right: Illustration & Animated Icons */}
          <div className="relative flex items-center justify-center min-h-[340px] md:min-h-[420px]" data-aos="fade-left">
            {/* Main illustration: Icon collage */}
            <div className="relative z-10">
              <div className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-blue-100 via-emerald-100 to-purple-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-white mx-auto">
                {/* Icon collage */}
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <Stethoscope className="w-14 h-14 text-blue-400 hero-float" />
                  <Hospital className="w-14 h-14 text-blue-300 hero-float animation-delay-2000" />
                  <Heart className="w-14 h-14 text-rose-400 hero-float animation-delay-4000" />
                  <UserPlus className="w-12 h-12 text-emerald-500 hero-float animation-delay-2000" />
                  <Smile className="w-12 h-12 text-yellow-400 hero-float animation-delay-4000" />
                  <BookOpen className="w-10 h-10 text-purple-400 hero-float animation-delay-2000" />
                </div>
              </div>
              {/* Floating icons */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hero-float">
                <Stethoscope className="w-10 h-10 text-blue-400 drop-shadow-lg" />
              </div>
              <div className="absolute top-1/2 -left-8 -translate-y-1/2 hero-float animation-delay-2000">
                <Syringe className="w-8 h-8 text-emerald-400 drop-shadow-lg" />
              </div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hero-float animation-delay-4000">
                <BookOpen className="w-8 h-8 text-purple-400 drop-shadow-lg" />
              </div>
              <div className="absolute top-1/2 -right-8 -translate-y-1/2 hero-float animation-delay-2000">
                <Smile className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
              </div>
              <div className="absolute bottom-8 right-8 hero-float animation-delay-4000">
                <Hospital className="w-8 h-8 text-blue-300 drop-shadow-lg" />
              </div>
            </div>
            {/* Decorative clouds/sun/moon for playful effect */}
            <Sun className="absolute top-0 left-0 w-10 h-10 text-yellow-300 opacity-70 hero-float" />
            <Cloud className="absolute top-10 right-0 w-14 h-14 text-blue-200 opacity-60 hero-float animation-delay-2000" />
            <Moon className="absolute bottom-0 left-10 w-10 h-10 text-purple-200 opacity-60 hero-float animation-delay-4000" />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6" data-aos="fade-up">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Excel
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-aos="fade-up" data-aos-delay="100">
            Comprehensive tools designed specifically for pediatric care, from patient management to AI-powered insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature Cards */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100" data-aos="zoom-in" data-aos-delay="100">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Secure Patient Records</h3>
            <p className="text-gray-600 leading-relaxed">
              HIPAA-compliant patient data management with encrypted storage and role-based access control.
            </p>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100" data-aos="zoom-in" data-aos-delay="200">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Scheduling</h3>
            <p className="text-gray-600 leading-relaxed">
              Intelligent appointment management with automated reminders, follow-ups, and conflict detection.
            </p>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100" data-aos="zoom-in" data-aos-delay="300">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Brain className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">AI Clinical Assistant</h3>
            <p className="text-gray-600 leading-relaxed">
              Real-time AI-powered insights, diagnosis suggestions, and treatment recommendations.
            </p>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100" data-aos="zoom-in" data-aos-delay="400">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Growth Tracking</h3>
            <p className="text-gray-600 leading-relaxed">
              Visual growth charts, milestone tracking, and vaccination schedules with automated reminders.
            </p>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100" data-aos="zoom-in" data-aos-delay="500">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Automated Workflows</h3>
            <p className="text-gray-600 leading-relaxed">
              Streamlined processes for billing, reporting, and patient communication with email/WhatsApp integration.
            </p>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100" data-aos="zoom-in" data-aos-delay="600">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Award className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Professional Reports</h3>
            <p className="text-gray-600 leading-relaxed">
              Beautiful, comprehensive reports for patients, parents, and regulatory compliance.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6" data-aos="fade-up">
              Get Started in{' '}
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Minutes
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-aos="fade-up" data-aos-delay="100">
              Simple setup process that gets your clinic up and running quickly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative" data-aos="fade-up" data-aos-delay="100">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">1. Add Your Team</h3>
                <p className="text-gray-600">
                  Invite doctors, nurses, and staff with role-based permissions.
                </p>
              </div>
              <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 hidden md:block">
                <ChevronRight className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="relative" data-aos="fade-up" data-aos-delay="200">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-8 h-8 text-white animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">2. Import Patients</h3>
                <p className="text-gray-600">
                  Bulk import existing patient data or add patients one by one.
                </p>
              </div>
              <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 hidden md:block">
                <ChevronRight className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div data-aos="fade-up" data-aos-delay="300">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-white animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">3. Start Caring</h3>
                <p className="text-gray-600">
                  Begin scheduling appointments and providing enhanced care immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-3xl p-12 text-white" data-aos="zoom-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Clinic?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join hundreds of pediatricians who trust PediaCircle for their practice management.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Replace Start Free Trial with Get Started button */}
              <button
                onClick={() => setIsGetStartedOpen(true)}
                className="px-8 py-4 bg-white text-blue-600 rounded-full text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Get Started
              </button>
              <a
                href="/superadmin-login"
                className="px-8 py-4 border-2 border-white text-white rounded-full text-xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-200"
              >
                Admin Portal
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="text-xl font-bold">PediaCircle</div>
              </div>
              <p className="text-gray-400">
                Empowering pediatricians with AI-powered clinic management solutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/security" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link to="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/helpcenter" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/documentation" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} PediaCircle. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link>
              <Link to="/cookies" className="text-gray-400 hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {isVideoPlaying && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Product Demo</h3>
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Video demo would go here</p>
            </div>
          </div>
        </div>
      )}
      {/* Get Started Modal */}
      <GetStartedModal isOpen={isGetStartedOpen} onClose={() => setIsGetStartedOpen(false)} />
    </div>
  );
} 