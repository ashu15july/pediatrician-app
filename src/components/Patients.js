import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, ChevronDown, ChevronUp, User, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { getPatients, deletePatient } from '../services/patientService';
import NewPatientForm from './NewPatientForm';
import PatientDetails from './PatientDetails';
import AppointmentScheduler from './AppointmentScheduler';
import { supabase } from '../lib/supabase';

const Patients = ({ onPatientAdded }) => {
  const { hasPermission: authHasPermission } = useAuth();
  const { hasPermission: clinicHasPermission, currentUser: clinicUser } = useClinicAuth();
  const { clinic, loading: clinicLoading, error: clinicError } = useClinic();
  
  // Determine which permission function to use
  const hasPermission = clinicUser ? clinicHasPermission : authHasPermission;

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [newPatient, setNewPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [deletingPatient, setDeletingPatient] = useState(null);

  useEffect(() => {
    if (clinic && !clinicLoading) {
      loadPatients();
    }
    // eslint-disable-next-line
  }, [clinic, clinicLoading]);

  const loadPatients = async () => {
    if (!clinic) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getPatients(clinic.id);
      setPatients(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientAdded = (patient) => {
    setShowNewPatientForm(false);
    setPatients(prev => [...prev, patient]);
    if (onPatientAdded) {
      onPatientAdded(patient);
    }
  };

  const handleAppointmentScheduled = () => {
    setShowAppointmentScheduler(false);
    setNewPatient(null);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.guardian_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (patient) => {
    setSelectedPatient(patient);
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
  };

  const handleDeletePatient = async (patient) => {
    if (window.confirm(`Are you sure you want to delete ${patient.name}? This action cannot be undone.`)) {
      try {
        await deletePatient(patient.id, clinic.id);
        setPatients(prev => prev.filter(p => p.id !== patient.id));
        setDeletingPatient(null);
      } catch (err) {
        console.error('Error deleting patient:', err);
        alert('Failed to delete patient. Please try again.');
      }
    }
  };

  const handlePatientUpdated = (updatedPatient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    setEditingPatient(null);
  };

  if (clinicLoading) {
    return <div className="flex items-center justify-center h-64">Loading clinic info...</div>;
  }
  if (clinicError) {
    return <div className="text-red-500 text-center p-4">{clinicError}</div>;
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-200">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <h2 className="text-2xl font-bold text-blue-800 tracking-tight">Patients</h2>
        </div>
        {hasPermission('manage_patients') && (
          <button
            onClick={() => setShowNewPatientForm(true)}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold shadow-lg hover:from-blue-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Patient</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search patients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-full border border-blue-200 shadow focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-800 text-base"
        />
        <Search className="w-5 h-5 text-blue-400 absolute left-4 top-3.5" />
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-blue-100">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Patient ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Guardian</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-blue-50">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-blue-50 transition-all duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-blue-900">{patient.patient_id || 'N/A'}</div>
                    <div className="text-xs text-blue-500">ID</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-blue-900">{patient.name}</div>
                    <div className="text-xs text-blue-500">{patient.gender}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-blue-900 font-semibold">{patient.age} years</div>
                    <div className="text-xs text-blue-500">DOB: {new Date(patient.dob).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-blue-900 font-semibold">{patient.guardian_name}</div>
                    <div className="text-xs text-blue-500">{patient.guardian_relationship}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-blue-900 font-semibold">{patient.guardian_phone}</div>
                    <div className="text-xs text-blue-500">{patient.guardian_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(patient)}
                        className="inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 shadow hover:bg-blue-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                      {hasPermission('manage_patients') && (
                        <>
                          <button
                            onClick={() => handleEditPatient(patient)}
                            className="inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700 shadow hover:bg-yellow-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          {(clinicUser.role === 'doctor' || clinicUser.role === 'admin') && (
                            <button
                              onClick={() => handleDeletePatient(patient)}
                              className="inline-flex items-center gap-1 px-4 py-1 rounded-full font-semibold bg-red-100 text-red-700 shadow hover:bg-red-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <div className="px-8 py-6">
              <PatientDetails
                patient={selectedPatient}
                selectedDate={selectedDate}
                onClose={() => setSelectedPatient(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* New Patient Form Modal */}
      {showNewPatientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <div className="px-8 py-6">
              <NewPatientForm
                onClose={() => setShowNewPatientForm(false)}
                onPatientAdded={handlePatientAdded}
              />
            </div>
          </div>
        </div>
      )}

      {/* Appointment Scheduler Modal */}
      {showAppointmentScheduler && newPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="px-8 py-6">
              <AppointmentScheduler
                patient={newPatient}
                onClose={() => setShowAppointmentScheduler(false)}
                onAppointmentScheduled={handleAppointmentScheduled}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Form Modal */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <div className="px-8 py-6">
              <NewPatientForm
                onClose={() => setEditingPatient(null)}
                onPatientAdded={handlePatientUpdated}
                editingPatient={editingPatient}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients; 