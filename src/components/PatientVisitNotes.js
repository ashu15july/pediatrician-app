import React, { useState, useEffect } from 'react';
import { FileText, Calendar, User, Heart, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PatientVisitNotes = ({ patientId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (patientId) {
      loadVisitNotes();
    }
  }, [patientId]);

  const loadVisitNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visit_notes')
        .select(`
          *,
          doctor:users!visit_notes_user_id_fkey(id, full_name)
        `)
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error loading visit notes:', err);
      setError('Failed to load visit notes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading medical records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No visit notes found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Medical Records
        </h2>
        <span className="text-sm text-gray-500">{notes.length} visit(s)</span>
      </div>

      <div className="space-y-6">
        {notes.map((note, index) => (
          <div key={note.id} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            {/* Visit Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    {new Date(note.visit_date).toLocaleDateString()}
                  </h3>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Dr. {note.doctor?.full_name || 'Unknown'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {note.visit_type}
              </span>
            </div>

            {/* Visit Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chief Complaint */}
              {note.chief_complaint && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Chief Complaint
                  </h4>
                  <p className="text-gray-600 bg-orange-50 p-3 rounded-lg">
                    {note.chief_complaint}
                  </p>
                </div>
              )}

              {/* Diagnosis */}
              {note.diagnosis && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Diagnosis
                  </h4>
                  <p className="text-gray-600 bg-green-50 p-3 rounded-lg">
                    {note.diagnosis}
                  </p>
                </div>
              )}

              {/* Physical Examination */}
              {note.physical_exam && (
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Physical Examination
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(note.physical_exam).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium text-gray-700 capitalize">
                            {key.replace('_', ' ')}:
                          </span>
                          <span className="text-gray-600 ml-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Treatment Plan */}
              {note.treatment_plan && (
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Treatment Plan
                  </h4>
                  <div className="bg-purple-50 p-3 rounded-lg space-y-2">
                    {note.treatment_plan.medications && (
                      <div>
                        <span className="font-medium text-gray-700">Medications:</span>
                        <p className="text-gray-600 ml-2">{note.treatment_plan.medications}</p>
                      </div>
                    )}
                    {note.treatment_plan.advice && (
                      <div>
                        <span className="font-medium text-gray-700">Advice:</span>
                        <p className="text-gray-600 ml-2">{note.treatment_plan.advice}</p>
                      </div>
                    )}
                    {note.treatment_plan.vaccines_given && (
                      <div>
                        <span className="font-medium text-gray-700">Vaccines Given:</span>
                        <p className="text-gray-600 ml-2">{note.treatment_plan.vaccines_details}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Development Status */}
              {note.development_status && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Development Status</h4>
                  <p className="text-gray-600 bg-blue-50 p-3 rounded-lg">
                    {note.development_status}
                    {note.development_delay_details && (
                      <span className="block mt-1 text-sm text-gray-500">
                        Details: {note.development_delay_details}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Vitals */}
              {note.vitals && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Vitals</h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    {note.vitals.height && (
                      <div className="text-sm">
                        <span className="font-medium">Height:</span> {note.vitals.height} cm
                      </div>
                    )}
                    {note.vitals.weight && (
                      <div className="text-sm">
                        <span className="font-medium">Weight:</span> {note.vitals.weight} kg
                      </div>
                    )}
                    {note.vitals.temperature && (
                      <div className="text-sm">
                        <span className="font-medium">Temperature:</span> {note.vitals.temperature}°C
                      </div>
                    )}
                    {note.vitals.heart_rate && (
                      <div className="text-sm">
                        <span className="font-medium">Heart Rate:</span> {note.vitals.heart_rate} bpm
                      </div>
                    )}
                    {note.vitals.blood_pressure && (
                      <div className="text-sm">
                        <span className="font-medium">Blood Pressure:</span> {note.vitals.blood_pressure}
                      </div>
                    )}
                    {note.vitals.head_circumference && (
                      <div className="text-sm">
                        <span className="font-medium">Head Circumference:</span> {note.vitals.head_circumference} cm
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Follow-up */}
              {note.follow_up_date && (
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Follow-up</h4>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-gray-600">
                      <span className="font-medium">Date:</span> {new Date(note.follow_up_date).toLocaleDateString()}
                    </p>
                    {note.follow_up_notes && (
                      <p className="text-gray-600 mt-1">
                        <span className="font-medium">Notes:</span> {note.follow_up_notes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Response */}
            {note.ai_response && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-500" />
                  AI Assessment
                </h4>
                <p className="text-gray-600 text-sm">{note.ai_response}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientVisitNotes; 