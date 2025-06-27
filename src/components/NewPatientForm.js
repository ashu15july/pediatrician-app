import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { getSubdomain } from '../utils/getSubdomain';

const NewPatientForm = ({ onClose, onPatientAdded, editingPatient }) => {
  const { currentUser } = useAuth();
  const { currentUser: clinicUser } = useClinicAuth();
  
  // Use clinic user if available, otherwise use regular user
  const activeUser = clinicUser || currentUser;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const [allergyInput, setAllergyInput] = useState('');

  // Populate form with existing data when editing
  useEffect(() => {
    if (editingPatient) {
      setFormData({
        name: editingPatient.name || '',
        dob: editingPatient.dob || '',
        gender: editingPatient.gender || '',
        delivery_type: editingPatient.delivery_type || '',
        birth_term: editingPatient.birth_term || '',
        gestational_age_weeks: editingPatient.gestational_age_weeks || '',
        guardian_name: editingPatient.guardian_name || '',
        guardian_phone: editingPatient.guardian_phone || '',
        guardian_email: editingPatient.guardian_email || '',
        guardian_relationship: editingPatient.guardian_relationship || '',
        address: editingPatient.address || '',
        blood_group: editingPatient.blood_group || '',
        allergies: editingPatient.allergies || [],
        medical_history: editingPatient.medical_history || ''
      });
    }
  }, [editingPatient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      const requiredFields = ['name', 'dob', 'gender', 'guardian_name', 'guardian_phone', 'guardian_relationship'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate gestational age for premature/postmature births
      if ((formData.birth_term === 'premature' || formData.birth_term === 'postmature') && !formData.gestational_age_weeks) {
        throw new Error('Gestational age is required for premature or postmature births');
      }

      // Validate gestational age range
      if (formData.gestational_age_weeks) {
        const weeks = parseInt(formData.gestational_age_weeks);
        if (weeks < 20 || weeks > 45) {
          throw new Error('Gestational age must be between 20 and 45 weeks');
        }
      }

      // Validate email format if provided
      if (formData.guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardian_email)) {
        throw new Error('Please enter a valid email address or leave it empty');
      }

      const patientData = {
        ...formData,
        age: calculateAge(formData.dob),
        created_at: new Date().toISOString()
      };
      
      // Ensure email is null if empty to satisfy database constraint
      if (!patientData.guardian_email || patientData.guardian_email.trim() === '') {
        patientData.guardian_email = null;
      }

      // Ensure gestational_age_weeks is null for full-term births
      if (patientData.birth_term === 'full_term') {
        patientData.gestational_age_weeks = null;
      }
      
      let patient;
      let patientError;

      if (editingPatient) {
        // Update existing patient - use direct table access for updates
        const { data, error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', editingPatient.id)
          .select()
          .single();
        
        patient = data;
        patientError = error;
      } else {
        // Insert new patient using RPC function
        const clinicSubdomain = localStorage.getItem('currentClinicSubdomain') || getSubdomain();
        
        if (!clinicSubdomain) {
          throw new Error('Clinic subdomain not found');
        }

        const { data, error } = await supabase
          .rpc('add_clinic_patient', {
            clinic_subdomain: clinicSubdomain,
            patient_name: patientData.name,
            patient_age: patientData.age,
            patient_dob: patientData.dob,
            patient_gender: patientData.gender,
            patient_guardian_name: patientData.guardian_name,
            patient_guardian_phone: patientData.guardian_phone,
            patient_guardian_email: patientData.guardian_email,
            patient_address: patientData.address,
            patient_blood_group: patientData.blood_group,
            patient_allergies: patientData.allergies,
            patient_medical_history: patientData.medical_history
          });
        
        patient = data;
        patientError = error;
      }

      if (patientError) {
        console.error('NewPatientForm: Patient creation error:', patientError);
        // Provide a more user-friendly error message for constraint violations
        if (patientError.message && patientError.message.includes('valid_guardian_email')) {
          throw new Error('Please enter a valid email address or leave the email field completely empty');
        }
        throw patientError;
      }

      // Create notification for admin (only for new patients)
      if (!editingPatient) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: activeUser.id,
            type: 'new_patient',
            message: `New patient registered: ${formData.name}`,
            is_read: false
          }]);
      }

      onPatientAdded(patient);
      onClose();
    } catch (err) {
      console.error('NewPatientForm: Error adding patient:', err);
      setError(err.message || 'Failed to add patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        {editingPatient ? 'Edit Patient' : 'New Patient Registration'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700 dark:text-gray-200">Patient Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 pl-10"
                  required
                />
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Delivery Type
              </label>
              <select
                name="delivery_type"
                value={formData.delivery_type}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select delivery type</option>
                <option value="normal">Normal Delivery</option>
                <option value="c_section">C-Section</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Birth Term
              </label>
              <select
                name="birth_term"
                value={formData.birth_term}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select birth term</option>
                <option value="full_term">Full Term (37-42 weeks)</option>
                <option value="premature">Premature (&lt;37 weeks)</option>
                <option value="postmature">Postmature (&gt;42 weeks)</option>
              </select>
            </div>

            {(formData.birth_term === 'premature' || formData.birth_term === 'postmature') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Gestational Age at Birth (weeks) *
                </label>
                <input
                  type="number"
                  name="gestational_age_weeks"
                  value={formData.gestational_age_weeks}
                  onChange={handleChange}
                  min="20"
                  max="45"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., 32 for premature, 43 for postmature"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Blood Group
              </label>
              <select
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
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
            <h3 className="font-medium text-gray-700 dark:text-gray-200">Guardian Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Guardian Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 pl-10"
                  required
                />
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Relationship *
              </label>
              <select
                name="guardian_relationship"
                value={formData.guardian_relationship}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="guardian_phone"
                  value={formData.guardian_phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 pl-10"
                  required
                />
                <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Email (Optional)
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="guardian_email"
                  value={formData.guardian_email}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 pl-10"
                  placeholder="Enter email address or leave empty"
                />
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 dark:text-gray-200">Additional Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Address
            </label>
            <div className="relative">
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 pl-10"
              />
              <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Allergies
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2"
                  placeholder="Enter allergy"
                />
                <button
                  type="button"
                  onClick={handleAddAllergy}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {formData.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.allergies.map((allergy, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-gray-100 rounded-full px-3 py-1"
                    >
                      <span className="text-sm">{allergy}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(index)}
                        className="ml-2 text-gray-500 dark:text-gray-300 hover:text-gray-700"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Medical History
            </label>
            <textarea
              name="medical_history"
              value={formData.medical_history}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
              placeholder="Enter relevant medical history"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (editingPatient ? 'Updating Patient...' : 'Adding Patient...') : (editingPatient ? 'Update Patient' : 'Add Patient')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPatientForm; 