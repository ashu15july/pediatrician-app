import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, AlertCircle, X, Hash, Heart, Calendar, Baby, Shield, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { getSubdomain } from '../utils/getSubdomain';
import PatientIdPopup from './PatientIdPopup';

const NewPatientForm = ({ onClose, onPatientAdded, editingPatient, isSelfRegistration = false, isModal = false }) => {
  const { currentUser } = useAuth();
  const { currentUser: clinicUser } = useClinicAuth();
  
  // Use clinic user if available, otherwise use regular user
  const activeUser = clinicUser || currentUser;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [generatedPatientId, setGeneratedPatientId] = useState('');
  const [showPatientIdPopup, setShowPatientIdPopup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    delivery_type: '',
    birth_term: '',
    gestational_age_weeks: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    guardian_relationship: '',
    address: '',
    blood_group: '',
    allergies: [],
    medical_history: ''
  });
  const [clinicInfo, setClinicInfo] = useState(null);

  const [allergyInput, setAllergyInput] = useState('');

  // Helper function to ensure all form values are strings
  const ensureStringValue = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  // Populate form with existing data when editing
  useEffect(() => {
    if (editingPatient) {
      const newFormData = {
        name: editingPatient.name ?? '',
        dob: editingPatient.dob ?? '',
        gender: editingPatient.gender ?? '',
        delivery_type: editingPatient.delivery_type ?? '',
        birth_term: editingPatient.birth_term ?? '',
        gestational_age_weeks: editingPatient.gestational_age_weeks ?? '',
        guardian_name: editingPatient.guardian_name ?? '',
        guardian_phone: editingPatient.guardian_phone ?? '',
        guardian_email: editingPatient.guardian_email ?? '',
        guardian_relationship: editingPatient.guardian_relationship ?? '',
        address: editingPatient.address ?? '',
        blood_group: editingPatient.blood_group ?? '',
        allergies: editingPatient.allergies ?? [],
        medical_history: editingPatient.medical_history ?? ''
      };
      setFormData(newFormData);
    } else {
      // Ensure form is properly reset when not editing
      const resetFormData = {
        name: '',
        dob: '',
        gender: '',
        delivery_type: '',
        birth_term: '',
        gestational_age_weeks: '',
        guardian_name: '',
        guardian_phone: '',
        guardian_email: '',
        guardian_relationship: '',
        address: '',
        blood_group: '',
        allergies: [],
        medical_history: ''
      };
      setFormData(resetFormData);
    }
  }, [editingPatient]);

  // Ensure form data is always properly initialized
  useEffect(() => {
    setFormData(prev => {
      const sanitizedData = {};
      Object.keys(prev).forEach(key => {
        if (key === 'allergies') {
          sanitizedData[key] = Array.isArray(prev[key]) ? prev[key] : [];
        } else {
          sanitizedData[key] = prev[key] ?? '';
        }
      });
      return sanitizedData;
    });
  }, []);

  // Fetch clinic info for new patients
  useEffect(() => {
    const fetchClinicInfo = async () => {
      if (!editingPatient) {
        const clinicSubdomain = localStorage.getItem('currentClinicSubdomain') || getSubdomain();
        if (clinicSubdomain) {
          try {
            const { data: clinicData, error: clinicError } = await supabase
              .from('clinics')
              .select('*')
              .eq('subdomain', clinicSubdomain)
              .single();

            if (clinicError) {
              console.error('Error fetching clinic info:', clinicError);
            } else {
              setClinicInfo(clinicData);
            }
          } catch (error) {
            console.error('Error fetching clinic info:', error);
          }
        }
      }
    };

    fetchClinicInfo();
  }, [editingPatient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || '' // Ensure value is never undefined
    }));
  };

  const handleAddAllergy = () => {
    if (allergyInput.trim()) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()]
      }));
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (index) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      const clinicSubdomain = localStorage.getItem('currentClinicSubdomain') || getSubdomain();
      
      if (!clinicSubdomain) {
        throw new Error('Clinic subdomain not found');
      }

      // Calculate age from date of birth
      const age = calculateAge(formData.dob);

      // Prepare patient data
      const patientData = {
        clinic_subdomain: clinicSubdomain,
        patient_name: formData.name,
        patient_dob: formData.dob,
        patient_age: age,
        patient_gender: formData.gender,
        patient_delivery_type: formData.delivery_type,
        patient_birth_term: formData.birth_term,
        patient_gestational_age_weeks: formData.gestational_age_weeks ? parseInt(formData.gestational_age_weeks) : null,
        patient_guardian_name: formData.guardian_name,
        patient_guardian_phone: formData.guardian_phone,
        patient_guardian_email: formData.guardian_email || null,
        patient_guardian_relationship: formData.guardian_relationship,
        patient_address: formData.address || null,
        patient_blood_group: formData.blood_group || null,
        patient_allergies: formData.allergies.length > 0 ? formData.allergies : null,
        patient_medical_history: formData.medical_history || null
      };

      // Call the RPC function
      const { data: patientResult, error: patientError } = await supabase.rpc('add_clinic_patient', patientData);

      if (patientError) {
        throw new Error(`Error creating patient: ${patientError.message}`);
      }

      if (patientResult && patientResult.success) {
        setSuccess(true);
        
        if (isSelfRegistration) {
          // For self-registration, show the patient ID popup
          const extractedPatientId = patientResult.patient_id;
          setGeneratedPatientId(extractedPatientId);
          setShowPatientIdPopup(true);
        } else {
          // For staff registration, just close the form
          if (onPatientAdded) {
            onPatientAdded(patientResult.patient_data);
          }
          onClose();
        }
      } else {
        throw new Error(patientResult?.message || 'Failed to create patient');
      }
    } catch (error) {
      console.error('NewPatientForm: Error adding patient:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };



  return (
    <div className={`${isModal ? 'p-0' : 'bg-white rounded-2xl shadow-xl p-8 border border-gray-100'} ${isSelfRegistration && !isModal ? 'max-w-md mx-auto' : ''}`}>
      {/* Header */}
      {!isModal && (
        <div className="mb-8">
          {isSelfRegistration && (
            <button
              onClick={onClose}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>
          )}
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-7 h-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {editingPatient ? 'Edit Patient' : (isSelfRegistration ? 'New Patient Registration' : 'New Patient Registration')}
            </h2>
            <p className="text-sm text-gray-600">
              {isSelfRegistration ? 'Create your account to access patient services' : 'Add a new patient to the system'}
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className={`space-y-6 ${isModal ? 'p-6' : ''}`}>
        {isSelfRegistration ? (
          // Single column layout for self-registration
          <>
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <Baby className="w-5 h-5 mr-2 text-blue-600" />
                  Patient Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2 text-blue-600" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={ensureStringValue(formData.name)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Patient ID field - only show for clinic staff, not for self-registration */}
                  {!isSelfRegistration && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Hash className="w-4 h-4 mr-2 text-blue-600" />
                        Patient ID
                      </label>
                      <div className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-600 font-mono">
                        Will be generated automatically
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Patient ID will be generated when you complete registration.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={ensureStringValue(formData.dob)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2 text-blue-600" />
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={ensureStringValue(formData.gender)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Baby className="w-4 h-4 mr-2 text-blue-600" />
                      Delivery Type
                    </label>
                    <select
                      name="delivery_type"
                      value={ensureStringValue(formData.delivery_type)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    >
                      <option value="">Select delivery type</option>
                      <option value="normal">Normal Delivery</option>
                      <option value="c_section">C-Section</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Baby className="w-4 h-4 mr-2 text-blue-600" />
                      Birth Term
                    </label>
                    <select
                      name="birth_term"
                      value={ensureStringValue(formData.birth_term)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    >
                      <option value="">Select birth term</option>
                      <option value="full_term">Full Term (37-42 weeks)</option>
                      <option value="premature">Premature (&lt;37 weeks)</option>
                      <option value="postmature">Postmature (&gt;42 weeks)</option>
                    </select>
                  </div>

                  {(formData.birth_term === 'premature' || formData.birth_term === 'postmature') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                        Gestational Age at Birth (weeks) *
                      </label>
                      <input
                        type="number"
                        name="gestational_age_weeks"
                        value={ensureStringValue(formData.gestational_age_weeks)}
                        onChange={handleChange}
                        min="20"
                        max="45"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="e.g., 32 for premature, 43 for postmature"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-blue-600" />
                      Blood Group
                    </label>
                    <select
                      name="blood_group"
                      value={ensureStringValue(formData.blood_group)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Guardian Information */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-emerald-600" />
                  Guardian Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2 text-emerald-600" />
                      Guardian Name *
                    </label>
                    <input
                      type="text"
                      name="guardian_name"
                      value={ensureStringValue(formData.guardian_name)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2 text-emerald-600" />
                      Relationship *
                    </label>
                    <select
                      name="guardian_relationship"
                      value={ensureStringValue(formData.guardian_relationship)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                      required
                    >
                      <option value="">Select relationship</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="guardian_phone"
                      value={ensureStringValue(formData.guardian_phone)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                      Email
                    </label>
                    <input
                      type="email"
                      name="guardian_email"
                      value={ensureStringValue(formData.guardian_email)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                      placeholder="Provide your email address to receive updates"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-gray-600" />
                  Additional Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-600" />
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={ensureStringValue(formData.address)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-gray-600" />
                      Allergies
                    </label>
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={ensureStringValue(allergyInput)}
                          onChange={(e) => setAllergyInput(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                          placeholder="Enter allergy"
                        />
                        <button
                          type="button"
                          onClick={handleAddAllergy}
                          className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
                        >
                          Add
                        </button>
                      </div>
                      {formData.allergies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.allergies.map((allergy, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm"
                            >
                              <span className="text-sm text-gray-700">{allergy}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAllergy(index)}
                                className="ml-2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-gray-600" />
                      Medical History
                    </label>
                    <textarea
                      name="medical_history"
                      value={ensureStringValue(formData.medical_history)}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                      rows="3"
                      placeholder="Enter relevant medical history"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Two column layout for staff registration
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <Baby className="w-5 h-5 mr-2 text-blue-600" />
                  Patient Information
                </h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={ensureStringValue(formData.name)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    required
                  />
                </div>

                {/* Patient ID field removed - will be generated server-side */}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={ensureStringValue(formData.dob)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={ensureStringValue(formData.gender)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Baby className="w-4 h-4 mr-2 text-blue-600" />
                    Delivery Type
                  </label>
                  <select
                    name="delivery_type"
                    value={ensureStringValue(formData.delivery_type)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  >
                    <option value="">Select delivery type</option>
                    <option value="normal">Normal Delivery</option>
                    <option value="c_section">C-Section</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Baby className="w-4 h-4 mr-2 text-blue-600" />
                    Birth Term
                  </label>
                  <select
                    name="birth_term"
                    value={ensureStringValue(formData.birth_term)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  >
                    <option value="">Select birth term</option>
                    <option value="full_term">Full Term (37-42 weeks)</option>
                    <option value="premature">Premature (&lt;37 weeks)</option>
                    <option value="postmature">Postmature (&gt;42 weeks)</option>
                  </select>
                </div>

                {(formData.birth_term === 'premature' || formData.birth_term === 'postmature') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      Gestational Age at Birth (weeks) *
                    </label>
                    <input
                      type="number"
                      name="gestational_age_weeks"
                      value={ensureStringValue(formData.gestational_age_weeks)}
                      onChange={handleChange}
                      min="20"
                      max="45"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      placeholder="e.g., 32 for premature, 43 for postmature"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-blue-600" />
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={ensureStringValue(formData.blood_group)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              {/* Guardian Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <User className="w-5 h-5 mr-2 text-emerald-600" />
                  Guardian Information
                </h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-emerald-600" />
                    Guardian Name *
                  </label>
                  <input
                    type="text"
                    name="guardian_name"
                    value={ensureStringValue(formData.guardian_name)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-emerald-600" />
                    Relationship *
                  </label>
                  <select
                    name="guardian_relationship"
                    value={ensureStringValue(formData.guardian_relationship)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    required
                  >
                    <option value="">Select relationship</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="guardian_phone"
                    value={ensureStringValue(formData.guardian_phone)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="guardian_email"
                    value={ensureStringValue(formData.guardian_email)}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    placeholder="Enter email address or leave empty"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-gray-600" />
                Additional Information
              </h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-600" />
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                                      value={ensureStringValue(formData.address)}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-gray-600" />
                  Allergies
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={ensureStringValue(allergyInput)}
                      onChange={(e) => setAllergyInput(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                      placeholder="Enter allergy"
                    />
                    <button
                      type="button"
                      onClick={handleAddAllergy}
                      className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
                    >
                      Add
                    </button>
                  </div>
                  {formData.allergies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.allergies.map((allergy, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-3 shadow-sm"
                        >
                          <span className="text-sm text-gray-700">{allergy}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAllergy(index)}
                            className="ml-2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-gray-600" />
                  Medical History
                </label>
                <textarea
                  name="medical_history"
                                      value={ensureStringValue(formData.medical_history)}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                  rows="3"
                  placeholder="Enter relevant medical history"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end space-x-4 pt-6">
          
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {editingPatient ? 'Updating Patient...' : (isSelfRegistration ? 'Creating Account...' : 'Adding Patient...')}
              </div>
            ) : (
              editingPatient ? 'Update Patient' : (isSelfRegistration ? 'Create Account' : 'Add Patient')
            )}
          </button>
        </div>
      </div>
      
      {/* Patient ID Popup */}
      {showPatientIdPopup && (
        <PatientIdPopup
          patientId={generatedPatientId}
          patientName={formData.name}
          onClose={() => {
            setShowPatientIdPopup(false);
            onClose();
          }}
        />
      )}
    </div>
  );
};

export default NewPatientForm; 