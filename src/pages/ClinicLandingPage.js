import React, { useEffect, useState } from 'react';
import { getSubdomain } from '../utils/getSubdomain';
import { supabase } from '../lib/supabase';

export default function ClinicLandingPage() {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClinic = async () => {
      const subdomain = getSubdomain();
      if (!subdomain) return setLoading(false);
      
      try {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('subdomain', subdomain)
          .single();
        
        if (error) {
          return setLoading(false);
        }
        
        if (data) {
          setClinic(data);
        }
      } catch (err) {
        // Fetch error
      }
      
      setLoading(false);
    };
    fetchClinic();

    // Scroll animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    if (animatedElements.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
      );
      animatedElements.forEach((el) => observer.observe(el));
      return () => animatedElements.forEach((el) => observer.unobserve(el));
    }
  }, [loading]); // Re-run when loading is complete

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
  if (!clinic) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 max-w-xl w-full text-center">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">Clinic Not Found</h1>
        <p className="text-gray-600 mb-6">We couldn't find a clinic for this subdomain.</p>
        <a href="/" className="text-blue-600 underline">Go to Main Site</a>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-b border-pink-100/20 z-50 p-4 animate-fadeInUp">
        <nav className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 text-transparent bg-clip-text flex items-center gap-2">
            <span className="text-3xl animate-pulse">⭐</span>
            {clinic.name || 'Pediatric Clinic'}
          </div>
          <div className="flex gap-4">
            <a href="/patient-login" className="py-2 px-6 rounded-full font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 transform transition-transform">Patient Login</a>
            <a href="/clinic-login" className="py-2 px-6 rounded-full font-semibold text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-colors">Clinic Login</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 relative flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-300 rounded-full opacity-20 blur-2xl animate-float"></div>
          <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-green-300 rounded-full opacity-20 blur-2xl animate-float animation-delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-yellow-300 rounded-full opacity-20 blur-2xl animate-float animation-delay-2000"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center z-10">
          <div className="text-white animate-slideInLeft">
            <h1 className="text-5xl font-extrabold mb-6 leading-tight">Expert Pediatric Care for Your Little Stars</h1>
            <p className="text-xl mb-8 opacity-90">{clinic.tagline || 'Comprehensive healthcare services designed specifically for children, delivered with compassion and expertise by our dedicated team of pediatric specialists.'}</p>
            <a href="#services" className="py-3 px-8 rounded-full font-semibold text-white bg-gradient-to-r from-pink-500 to-red-500 shadow-lg hover:scale-105 transform transition-transform">Explore Our Services</a>
          </div>
          <div className="relative animate-slideInRight">
            <div className="w-full h-[500px] bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl flex items-center justify-center text-6xl relative overflow-hidden">
              <div className="text-center text-white/80">
                <div className="text-6xl mb-4 animate-pulse">👩‍⚕️ 🩺 👶</div>
                <div className="text-xl">Caring for Children</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-gradient-to-br from-pink-50 to-red-50 relative">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-indigo-700 to-transparent opacity-30 -translate-y-full"></div>
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-800">
          <h2 className="text-4xl font-bold mb-12 animate-on-scroll">Our Specialized Services</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 animate-on-scroll">
              <div className="text-4xl mb-4">🩺</div>
              <h3 className="text-xl font-semibold mb-2">General Pediatrics</h3>
              <p>Comprehensive health checkups, vaccinations, and preventive care for children from infancy through adolescence.</p>
            </div>
            <div className="bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 animate-on-scroll">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold mb-2">Developmental Assessment</h3>
              <p>Expert evaluation of your child's physical, cognitive, and emotional development milestones.</p>
            </div>
            <div className="bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 animate-on-scroll">
              <div className="text-4xl mb-4">🏃‍♂️</div>
              <h3 className="text-xl font-semibold mb-2">Sports Medicine</h3>
              <p>Specialized care for young athletes, including injury prevention and treatment programs.</p>
            </div>
            <div className="bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 animate-on-scroll">
              <div className="text-4xl mb-4">🧬</div>
              <h3 className="text-xl font-semibold mb-2">Genetic Counseling</h3>
              <p>Professional guidance and testing for hereditary conditions and genetic disorders.</p>
            </div>
            <div className="bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 animate-on-scroll">
              <div className="text-4xl mb-4">🌟</div>
              <h3 className="text-xl font-semibold mb-2">Behavioral Health</h3>
              <p>Mental health support and behavioral interventions tailored for children and adolescents.</p>
            </div>
            <div className="bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 animate-on-scroll">
              <div className="text-4xl mb-4">🚑</div>
              <h3 className="text-xl font-semibold mb-2">Emergency Care</h3>
              <p>24/7 urgent care services for pediatric emergencies and acute medical conditions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gradient-to-br from-blue-500 to-indigo-700 text-white text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4 animate-on-scroll">Get in Touch</h2>
          <p className="mb-12 animate-on-scroll">We're here to provide the best care for your child. Contact us to schedule an appointment or learn more about our services.</p>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 animate-on-scroll">
              <h3 className="text-lg font-semibold mb-2">📞 Phone</h3>
              <p>{clinic?.phone || 'Contact us for phone number'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 animate-on-scroll">
              <h3 className="text-lg font-semibold mb-2">📧 Email</h3>
              <p>{clinic?.email || 'Contact us for email'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 animate-on-scroll">
              <h3 className="text-lg font-semibold mb-2">📍 Location</h3>
              <p>{clinic?.address || 'Contact us for address'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 animate-on-scroll">
              <h3 className="text-lg font-semibold mb-2">🕒 Hours</h3>
              <p>{clinic?.hours || 'Contact us for hours'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 