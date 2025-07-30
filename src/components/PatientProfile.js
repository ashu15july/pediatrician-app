import React, { useState, useEffect } from 'react';
import { User, Edit, Save, X, Plus, AlertTriangle, Heart, Shield, Users, Camera, Calendar, MapPin, Phone, Mail, Activity, Star, Award, Zap, Target, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PatientProfile = ({ patientId, patientName, patientDOB }) => {
  const [patient, setPatient] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    address: '',
    phone: '',
    email: ''
  });
  const [allergyForm, setAllergyForm] = useState({
    allergen: '',
    type: '',
    severity: '',
    notes: ''
  });
  const [conditionForm, setConditionForm] = useState({
    condition: '',
    diagnosedDate: '',
    status: '',
    notes: ''
  });
  const [caregiverForm, setCaregiverForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    isPrimary: false
  });

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      // Load patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);
      setFormData({
        name: patientData.name || '',
        dob: patientData.dob || '',
        gender: patientData.gender || '',
        bloodGroup: patientData.blood_group || '',
        address: patientData.address || '',
        phone: patientData.guardian_phone || '',
        email: patientData.guardian_email || ''
      });

      // Load allergies
      const { data: allergiesData, error: allergiesError } = await supabase
        .from('patient_allergies')
        .select('*')
        .eq('patient_id', patientId);

      if (allergiesError) throw allergiesError;
      setAllergies(allergiesData || []);

      // Load chronic conditions
      const { data: conditionsData, error: conditionsError } = await supabase
        .from('patient_conditions')
        .select('*')
        .eq('patient_id', patientId);

      if (conditionsError) throw conditionsError;
      setConditions(conditionsData || []);

      // Load caregivers
      const { data: caregiversData, error: caregiversError } = await supabase
        .from('patient_caregivers')
        .select('*')
        .eq('patient_id', patientId)
        .order('is_primary', { ascending: false });

      if (caregiversError) throw caregiversError;
      setCaregivers(caregiversData || []);

    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          name: formData.name,
          dob: formData.dob,
          gender: formData.gender,
          blood_group: formData.bloodGroup,
          address: formData.address,
          guardian_phone: formData.phone,
          guardian_email: formData.email
        })
        .eq('id', patientId);

      if (error) throw error;
      setEditing(false);
      loadPatientData();
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const handleAddAllergy = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('patient_allergies')
        .insert([{
          patient_id: patientId,
          allergen: allergyForm.allergen,
          allergy_type: allergyForm.type,
          severity: allergyForm.severity,
          notes: allergyForm.notes
        }]);

      if (error) throw error;
      setShowAllergyModal(false);
      setAllergyForm({ allergen: '', type: '', severity: '', notes: '' });
      loadPatientData();
    } catch (error) {
      console.error('Error adding allergy:', error);
    }
  };

  const handleAddCondition = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('patient_conditions')
        .insert([{
          patient_id: patientId,
          condition: conditionForm.condition,
          diagnosed_date: conditionForm.diagnosedDate,
          status: conditionForm.status,
          notes: conditionForm.notes
        }]);

      if (error) throw error;
      setShowConditionModal(false);
      setConditionForm({ condition: '', diagnosedDate: '', status: '', notes: '' });
      loadPatientData();
    } catch (error) {
      console.error('Error adding condition:', error);
    }
  };

  const handleAddCaregiver = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('patient_caregivers')
        .insert([{
          patient_id: patientId,
          name: caregiverForm.name,
          relationship: caregiverForm.relationship,
          phone: caregiverForm.phone,
          email: caregiverForm.email,
          is_primary: caregiverForm.isPrimary
        }]);

      if (error) throw error;
      setShowCaregiverModal(false);
      setCaregiverForm({ name: '', relationship: '', phone: '', email: '', isPrimary: false });
      loadPatientData();
    } catch (error) {
      console.error('Error adding caregiver:', error);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mild':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'managed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <div className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-20 bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-20 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl border-4 border-white/30">
                  {patient?.gender === 'Male' ? '👦' : patient?.gender === 'Female' ? '👧' : '👤'}
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all duration-300">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{patient?.name}</h1>
                <div className="flex items-center space-x-4 text-purple-100">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {patient?.dob && `${calculateAge(patient.dob)} years old`}
                  </span>
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {patient?.gender}
                  </span>
                  {patient?.blood_group && (
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 mr-2" />
                      {patient.blood_group}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center space-x-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300"
            >
              {editing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              <span className="font-semibold">{editing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{allergies.length}</div>
              <div className="text-purple-100 text-sm">Allergies</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{conditions.length}</div>
              <div className="text-purple-100 text-sm">Conditions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{caregivers.length}</div>
              <div className="text-purple-100 text-sm">Caregivers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">12</div>
              <div className="text-purple-100 text-sm">Appointments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Personal Information</h2>
              <p className="text-blue-100 text-sm">Basic details and contact information</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{patient?.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                {editing ? (
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{patient?.dob && formatDate(patient.dob)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                {editing ? (
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-800 font-medium">{patient?.gender}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Group</label>
                {editing ? (
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
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
                ) : (
                  <p className="text-gray-800 font-medium">{patient?.blood_group}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                {editing ? (
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 resize-none"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{patient?.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{patient?.guardian_phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{patient?.guardian_email}</p>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex justify-end mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={handleSaveProfile}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Health Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Allergies Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Allergies</h3>
                  <p className="text-red-100 text-sm">Food, medication, and environmental</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllergyModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                <span className="font-semibold">Add</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {allergies.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-gray-500 font-medium">No allergies recorded</p>
                <p className="text-gray-400 text-sm mt-1">Add allergies to help healthcare providers</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allergies.map((allergy, index) => (
                  <div 
                    key={index} 
                    className="group bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 border border-red-100 hover:border-red-200 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                          {allergy.allergen}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {allergy.allergy_type} • {allergy.notes}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(allergy.severity)}`}>
                        {allergy.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chronic Conditions Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Chronic Conditions</h3>
                  <p className="text-orange-100 text-sm">Long-term health conditions</p>
                </div>
              </div>
              <button
                onClick={() => setShowConditionModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                <span className="font-semibold">Add</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {conditions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-gray-500 font-medium">No conditions recorded</p>
                <p className="text-gray-400 text-sm mt-1">Add chronic conditions for better care</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conditions.map((condition, index) => (
                  <div 
                    key={index} 
                    className="group bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100 hover:border-orange-200 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                          {condition.condition}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Diagnosed {formatDate(condition.diagnosed_date)} • {condition.notes}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(condition.status)}`}>
                        {condition.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caregivers Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Caregivers</h3>
                <p className="text-purple-100 text-sm">Parents, guardians, and contacts</p>
              </div>
            </div>
            <button
              onClick={() => setShowCaregiverModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              <span className="font-semibold">Add</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {caregivers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-gray-500 font-medium">No caregivers recorded</p>
              <p className="text-gray-400 text-sm mt-1">Add authorized contacts and guardians</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {caregivers.map((caregiver, index) => (
                <div 
                  key={index} 
                  className="group bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100 hover:border-purple-200 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                          {caregiver.name}
                        </h4>
                        {caregiver.is_primary && (
                          <span className="px-2 py-1 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-semibold">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{caregiver.relationship}</p>
                      <div className="space-y-1 text-xs text-gray-500">
                        <p className="flex items-center">
                          <Phone className="w-3 h-3 mr-2" />
                          {caregiver.phone}
                        </p>
                        <p className="flex items-center">
                          <Mail className="w-3 h-3 mr-2" />
                          {caregiver.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Allergy Modal */}
      {showAllergyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add Allergy</h3>
                    <p className="text-red-100 text-sm">Record new allergy information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllergyModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddAllergy} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Allergen</label>
                  <input
                    type="text"
                    value={allergyForm.allergen}
                    onChange={(e) => setAllergyForm({ ...allergyForm, allergen: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                  <select
                    value={allergyForm.type}
                    onChange={(e) => setAllergyForm({ ...allergyForm, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="Food">Food</option>
                    <option value="Medication">Medication</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Severity</label>
                  <select
                    value={allergyForm.severity}
                    onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  >
                    <option value="">Select severity</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={allergyForm.notes}
                    onChange={(e) => setAllergyForm({ ...allergyForm, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 resize-none"
                    placeholder="Additional notes about the allergy..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAllergyModal(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                  >
                    Add Allergy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Condition Modal */}
      {showConditionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Heart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add Condition</h3>
                    <p className="text-orange-100 text-sm">Record chronic health condition</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConditionModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddCondition} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                  <input
                    type="text"
                    value={conditionForm.condition}
                    onChange={(e) => setConditionForm({ ...conditionForm, condition: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosed Date</label>
                  <input
                    type="date"
                    value={conditionForm.diagnosedDate}
                    onChange={(e) => setConditionForm({ ...conditionForm, diagnosedDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={conditionForm.status}
                    onChange={(e) => setConditionForm({ ...conditionForm, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  >
                    <option value="">Select status</option>
                    <option value="Active">Active</option>
                    <option value="Managed">Managed</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={conditionForm.notes}
                    onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 resize-none"
                    placeholder="Additional notes about the condition..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConditionModal(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                  >
                    Add Condition
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Caregiver Modal */}
      {showCaregiverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add Caregiver</h3>
                    <p className="text-purple-100 text-sm">Add authorized contact person</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCaregiverModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddCaregiver} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={caregiverForm.name}
                    onChange={(e) => setCaregiverForm({ ...caregiverForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
                  <select
                    value={caregiverForm.relationship}
                    onChange={(e) => setCaregiverForm({ ...caregiverForm, relationship: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  >
                    <option value="">Select relationship</option>
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={caregiverForm.phone}
                    onChange={(e) => setCaregiverForm({ ...caregiverForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={caregiverForm.email}
                    onChange={(e) => setCaregiverForm({ ...caregiverForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300"
                    required
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={caregiverForm.isPrimary}
                    onChange={(e) => setCaregiverForm({ ...caregiverForm, isPrimary: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isPrimary" className="text-sm font-semibold text-gray-700">
                    Set as primary caregiver
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCaregiverModal(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                  >
                    Add Caregiver
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfile; 