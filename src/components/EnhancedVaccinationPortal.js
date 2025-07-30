import React, { useState, useEffect } from 'react';
import { 
  Syringe, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Download, 
  Bell,
  TrendingUp,
  FileText,
  Star,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { getVaccinations, upsertVaccination } from '../services/patientService';
import { IAP_SCHEDULE } from '../data/IAP_SCHEDULE.js';

const EnhancedVaccinationPortal = ({ patientId, patientName, patientAge, guardianName, patientDOB }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [dirtyRecords, setDirtyRecords] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  // Calculate due date based on age requirement
  const calculateDueDate = (ageRequirement) => {
    if (!patientDOB) return '';
    
    const dob = new Date(patientDOB);
    let dueDate = new Date(dob);

    if (ageRequirement === 'BIRTH') {
      return dob.toISOString().split('T')[0];
    }

    const match = ageRequirement.match(/(\d+)\s*(mo|weeks|yrs)/);
    if (!match) return '';

    const [_, number, unit] = match;
    const num = parseInt(number);

    switch (unit) {
      case 'weeks':
        dueDate.setDate(dob.getDate() + (num * 7));
        break;
      case 'mo':
        dueDate.setMonth(dob.getMonth() + num);
        break;
      case 'yrs':
        dueDate.setFullYear(dob.getFullYear() + num);
        break;
      default:
        return '';
    }

    return dueDate.toISOString().split('T')[0];
  };

  // Get vaccination status
  const getVaccinationStatus = (record) => {
    const today = new Date();
    const dueDate = new Date(record.due_date);
    const givenDate = record.given_date ? new Date(record.given_date) : null;

    if (givenDate) {
      return { status: 'completed', label: 'Completed', color: 'green', icon: CheckCircle };
    } else if (dueDate < today) {
      return { status: 'overdue', label: 'Overdue', color: 'red', icon: AlertTriangle };
    } else if (dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return { status: 'due', label: 'Due Soon', color: 'yellow', icon: Clock };
    } else {
      return { status: 'upcoming', label: 'Upcoming', color: 'blue', icon: Calendar };
    }
  };

  // Get statistics
  const getVaccinationStats = () => {
    const stats = {
      total: 0,
      completed: 0,
      overdue: 0,
      due: 0,
      upcoming: 0
    };

    records.forEach(record => {
      stats.total++;
      const status = getVaccinationStatus(record);
      stats[status.status]++;
    });

    return stats;
  };

  useEffect(() => {
    if (patientId) {
      setLoading(true);
      getVaccinations(patientId)
        .then(fetchedRecords => {
          const initializedRecords = IAP_SCHEDULE.flatMap(({ age, vaccines }) =>
            vaccines.map(vaccine => {
              const existingRecord = fetchedRecords.find(
                r => r.age_label === age && r.vaccine === vaccine
              );
              
              return {
                age_label: age,
                vaccine,
                due_date: existingRecord?.due_date || calculateDueDate(age),
                given_date: existingRecord?.given_date || '',
                lot_no: existingRecord?.lot_no || '',
              };
            })
          );
          setRecords(initializedRecords);
        })
        .catch((err) => {
          console.error('Vaccination fetch error:', err.message || err);
        })
        .finally(() => setLoading(false));
    }
  }, [patientId, patientDOB]);

  const handleChange = (age, vaccine, field, value) => {
    setRecords((prev) => {
      const idx = prev.findIndex(
        (rec) => rec.age_label === age && rec.vaccine === vaccine
      );
      let updated;
      if (idx !== -1) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], [field]: value };
      } else {
        updated = [
          ...prev,
          {
            age_label: age,
            vaccine,
            due_date: '',
            given_date: '',
            lot_no: '',
            [field]: value,
          },
        ];
      }
      setDirtyRecords((dirty) => ({ ...dirty, [`${age}|${vaccine}`]: true }));
      return updated;
    });
  };

  const handleSaveAll = async () => {
    try {
      const dirtyKeys = Object.keys(dirtyRecords);
      const toSave = records.filter(r => dirtyKeys.includes(`${r.age_label}|${r.vaccine}`));
      if (toSave.length === 0) return;
      await Promise.all(toSave.map(rec => upsertVaccination({ ...rec, patient_id: patientId })));
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      setDirtyRecords({});
    } catch (err) {
      console.error('Vaccination save error:', err.message || err);
    }
  };

  const toggleSection = (age) => {
    setExpandedSections(prev => ({
      ...prev,
      [age]: !prev[age]
    }));
  };

  const stats = getVaccinationStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Syringe className="w-8 h-8" />
              Vaccination Records
            </h2>
            <p className="text-blue-100 mt-1">Complete immunization tracking for {patientName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'card' 
                  ? 'bg-white text-blue-600' 
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white text-blue-600' 
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vaccines</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <Syringe className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Due Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.due}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Vaccination Cards */}
      {viewMode === 'card' && (
        <div className="space-y-4">
          {IAP_SCHEDULE.map(({ age, vaccines }) => (
            <div key={age} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleSection(age)}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-blue-50 hover:to-emerald-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white p-2 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{age}</h3>
                    <p className="text-sm text-gray-600">{vaccines.length} vaccine{vaccines.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {expandedSections[age] ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {expandedSections[age] && (
                <div className="p-6 border-t border-gray-100">
                  <div className="grid gap-4">
                    {vaccines.map((vaccine) => {
                      const record = records.find(r => r.age_label === age && r.vaccine === vaccine);
                      const status = getVaccinationStatus(record);
                      const StatusIcon = status.icon;
                      
                      return (
                        <div key={vaccine} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <StatusIcon className={`w-5 h-5 text-${status.color}-500`} />
                              <h4 className="font-semibold text-gray-800">{vaccine}</h4>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}>
                              {status.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                              <input
                                type="date"
                                value={record.due_date ? record.due_date.substring(0, 10) : ''}
                                onChange={(e) => handleChange(age, vaccine, 'due_date', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Given Date</label>
                              <input
                                type="date"
                                value={record.given_date ? record.given_date.substring(0, 10) : ''}
                                onChange={(e) => handleChange(age, vaccine, 'given_date', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number</label>
                              <input
                                type="text"
                                value={record.lot_no || ''}
                                onChange={(e) => handleChange(age, vaccine, 'lot_no', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter lot number"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vaccine</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot No.</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {IAP_SCHEDULE.map(({ age, vaccines }) =>
                  vaccines.map((vaccine) => {
                    const record = records.find(r => r.age_label === age && r.vaccine === vaccine);
                    const status = getVaccinationStatus(record);
                    const StatusIcon = status.icon;
                    
                    return (
                      <tr key={`${age}-${vaccine}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{age}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vaccine}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 text-${status.color}-500`} />
                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}>
                              {status.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="date"
                            value={record.due_date ? record.due_date.substring(0, 10) : ''}
                            onChange={(e) => handleChange(age, vaccine, 'due_date', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="date"
                            value={record.given_date ? record.given_date.substring(0, 10) : ''}
                            onChange={(e) => handleChange(age, vaccine, 'given_date', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={record.lot_no || ''}
                            onChange={(e) => handleChange(age, vaccine, 'lot_no', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Lot number"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveAll}
            disabled={Object.keys(dirtyRecords).length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Save Changes
          </button>
          
          {showSaved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Changes saved successfully!</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
            <Bell className="w-4 h-4" />
            Set Reminders
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVaccinationPortal; 