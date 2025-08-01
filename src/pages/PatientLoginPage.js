import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../contexts/PatientAuthContext';
import { getSubdomain } from '../utils/getSubdomain';
import { supabase } from '../lib/supabase';
import NewPatientForm from '../components/NewPatientForm';
import Modal from '../components/Modal';
import { 
  User, 
  Phone, 
  Search, 
  ArrowLeft, 
  Heart, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Hash,
  Users,
  Stethoscope
} from 'lucide-react';

export default function PatientLoginPage() {
  const [patientId, setPatientId] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clinicInfo, setClinicInfo] = useState(null);
  const [clinicLoading, setClinicLoading] = useState(true);
  const [showFindIdForm, setShowFindIdForm] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [findIdLoading, setFindIdLoading] = useState(false);
  const [findIdError, setFindIdError] = useState('');
  const [foundPatientId, setFoundPatientId] = useState('');
  const [findIdForm, setFindIdForm] = useState({
    guardianName: '',
    guardianPhone: '',
    patientName: ''
  });
  
  const { login } = usePatientAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClinicInfo = async () => {
      const subdomain = getSubdomain();
      if (subdomain) {
        try {
          setClinicLoading(true);
          const { data: clinicData, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('subdomain', subdomain)
            .single();

          if (error) {
            setClinicInfo({
              name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Clinic`,
              domain: `https://${subdomain}.myapp.com`
            });
          } else if (clinicData) {
            setClinicInfo({
              id: clinicData.id,
              name: clinicData.name,
              domain: clinicData.domain_url
            });
          }
        } catch (error) {
          setClinicInfo({
            name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Clinic`,
            domain: `https://${subdomain}.myapp.com`
          });
        } finally {
          setClinicLoading(false);
        }
      } else {
        setClinicLoading(false);
      }
    };

    fetchClinicInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(patientId, guardianPhone);
      if (result.success) {
        navigate('/patient-dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFindPatientId = async (e) => {
    e.preventDefault();
    setFindIdLoading(true);
    setFindIdError('');
    setFoundPatientId('');

    try {
      const { guardianName, guardianPhone, patientName } = findIdForm;
      
      if (!clinicInfo?.id) {
        setFindIdError('Clinic information not available. Please refresh the page and try again.');
        return;
      }
      
      // Use the API endpoint to find patient ID
      const response = await fetch('/api/find-patient-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          guardianName,
          guardianPhone,
          clinicId: clinicInfo.id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFoundPatientId(data.patientId);
        setPatientId(data.patientId); // Auto-fill the patient ID
        setGuardianPhone(data.guardianPhone); // Auto-fill the phone
        setShowFindIdForm(false);
      } else {
        setFindIdError(data.error || 'No patient found with the provided information. Please check your details or contact the clinic.');
      }
    } catch (err) {
      setFindIdError('An error occurred while searching. Please try again.');
    } finally {
      setFindIdLoading(false);
    }
  };

  const handleRegistrationSuccess = (patientData) => {
    // Auto-fill the login form with the newly registered patient's details
    setPatientId(patientData.patient_id);
    setGuardianPhone(patientData.guardian_phone);
    // Don't close the modal immediately - let the popup handle closing
    // setShowRegistrationModal(false);
  };

  if (clinicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 font-medium">Loading clinic information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100">
          {/* Header with Clinic Info */}
          {clinicInfo && (
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {clinicInfo.name}
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                Patient Portal
              </p>
            </div>
          )}
          
          <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Welcome Back</h3>
          
          {!showFindIdForm ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center">
                    <Hash className="w-4 h-4 mr-2 text-blue-600" />
                    Patient ID
                  </label>
                  <input 
                    type="text" 
                    value={patientId} 
                    onChange={e => setPatientId(e.target.value)} 
                    required 
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 px-4 py-3" 
                    placeholder="Enter your patient ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-blue-600" />
                    Guardian Phone Number
                  </label>
                  <input 
                    type="tel" 
                    value={guardianPhone} 
                    onChange={e => setGuardianPhone(e.target.value)} 
                    required 
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 px-4 py-3" 
                    placeholder="Enter guardian's phone number"
                  />
                </div>
                
                {error && (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center space-y-4">
                <button
                  onClick={() => setShowFindIdForm(true)}
                  className="flex items-center justify-center w-full text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Don't have your Patient ID? Find it here
                </button>
                
                <div className="flex items-center justify-center">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="px-4 text-gray-400 text-xs font-medium">or</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                
                <button
                  onClick={() => setShowRegistrationModal(true)}
                  className="flex items-center justify-center w-full text-emerald-600 hover:text-emerald-800 text-sm font-medium transition-colors duration-200"
                >
                  <User className="w-4 h-4 mr-2" />
                  New patient? Register here
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setShowFindIdForm(false);
                    setFindIdError('');
                    setFoundPatientId('');
                    setFindIdForm({ guardianName: '', guardianPhone: '', patientName: '' });
                  }}
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </button>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">Find Your Patient ID</h3>
              
              <form onSubmit={handleFindPatientId} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Patient Name
                  </label>
                  <input 
                    type="text" 
                    value={findIdForm.patientName} 
                    onChange={e => setFindIdForm({...findIdForm, patientName: e.target.value})} 
                    required 
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 px-4 py-3" 
                    placeholder="Enter patient's full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Guardian Name
                  </label>
                  <input 
                    type="text" 
                    value={findIdForm.guardianName} 
                    onChange={e => setFindIdForm({...findIdForm, guardianName: e.target.value})} 
                    required 
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 px-4 py-3" 
                    placeholder="Enter guardian's full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-blue-600" />
                    Guardian Phone Number
                  </label>
                  <input 
                    type="tel" 
                    value={findIdForm.guardianPhone} 
                    onChange={e => setFindIdForm({...findIdForm, guardianPhone: e.target.value})} 
                    required 
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 px-4 py-3" 
                    placeholder="Enter guardian's phone number"
                  />
                </div>
                
                {findIdError && (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">{findIdError}</span>
                  </div>
                )}
                
                {foundPatientId && (
                  <div className="flex items-center p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">Patient ID found! You can now sign in.</span>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={findIdLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {findIdLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Searching...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Search className="w-4 h-4 mr-2" />
                      Find Patient ID
                    </div>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Still having trouble? Contact the clinic for assistance.
            </p>
          </div>

          <div className="mt-6 text-center">
            <a href="/clinic-login" className="flex items-center justify-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200">
              <Stethoscope className="w-4 h-4 mr-2" />
              Staff Login →
            </a>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        title="New Patient Registration"
        size="xl"
      >
        <NewPatientForm
          onClose={() => setShowRegistrationModal(false)}
          onPatientAdded={handleRegistrationSuccess}
          isSelfRegistration={true}
          isModal={true}
        />
      </Modal>
    </div>
  );
} 