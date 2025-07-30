import React, { useState, useEffect } from 'react';
import { Baby, CheckCircle, Clock, AlertTriangle, Plus, Calendar, Target, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import milestonesData from '../data/milestones.json';

const MilestoneTracker = ({ patientId, patientName, patientDOB }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    milestone: '',
    category: '',
    achievedDate: '',
    notes: ''
  });

  const milestoneCategories = [
    { id: 'motor', name: 'Motor Skills', icon: '🏃', color: 'blue' },
    { id: 'language', name: 'Language', icon: '💬', color: 'green' },
    { id: 'social', name: 'Social & Emotional', icon: '😊', color: 'purple' },
    { id: 'cognitive', name: 'Cognitive', icon: '🧠', color: 'orange' }
  ];

  useEffect(() => {
    loadMilestones();
  }, [patientId]);

  const loadMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('developmental_milestones')
        .select('*')
        .eq('patient_id', patientId)
        .order('achieved_date', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('developmental_milestones')
        .insert([{
          patient_id: patientId,
          milestone: formData.milestone,
          category: formData.category,
          achieved_date: formData.achievedDate,
          notes: formData.notes
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setFormData({ milestone: '', category: '', achievedDate: '', notes: '' });
      loadMilestones();
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  };

  const calculateAge = (date) => {
    const today = new Date();
    const birthDate = new Date(date);
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (today.getMonth() - birthDate.getMonth());
    return ageInMonths;
  };

  const getMilestoneStatus = (expectedAge, achievedDate) => {
    if (achievedDate) return 'achieved';
    const currentAge = calculateAge(patientDOB);
    if (currentAge >= expectedAge + 2) return 'overdue';
    if (currentAge >= expectedAge) return 'due';
    return 'upcoming';
  };

  const getExpectedMilestones = () => {
    const currentAge = calculateAge(patientDOB);
    // Convert the milestones data structure to a flat array
    const flatMilestones = [];
    
    milestonesData.milestones.forEach((ageGroup, index) => {
      const ageRange = ageGroup.ageRange;
      
      // Parse age range safely
      let startAge = 0;
      let endAge = 0;
      
      if (ageRange && typeof ageRange === 'string') {
        if (ageRange.includes('-')) {
          const parts = ageRange.split('-');
          startAge = parseInt(parts[0]) || 0;
          const endPart = parts[1] ? parts[1].split(' ')[0] : '0';
          endAge = parseInt(endPart) || 0;
        } else {
          // Handle single age like "5 years"
          startAge = parseInt(ageRange.split(' ')[0]) || 0;
          endAge = startAge;
        }
      }
      
      // Add cognitive milestones
      if (ageGroup.cognitive && Array.isArray(ageGroup.cognitive)) {
        ageGroup.cognitive.forEach(milestone => {
          flatMilestones.push({
            milestone,
            category: 'cognitive',
            expectedAge: startAge,
            ageRange
          });
        });
      }
      
      // Add motor milestones
      if (ageGroup.grossMotor && Array.isArray(ageGroup.grossMotor)) {
        ageGroup.grossMotor.forEach(milestone => {
          flatMilestones.push({
            milestone,
            category: 'motor',
            expectedAge: startAge,
            ageRange
          });
        });
      }
      
      // Add fine motor milestones
      if (ageGroup.fineMotor && Array.isArray(ageGroup.fineMotor)) {
        ageGroup.fineMotor.forEach(milestone => {
          flatMilestones.push({
            milestone,
            category: 'motor',
            expectedAge: startAge,
            ageRange
          });
        });
      }
      
      // Add communication milestones
      if (ageGroup.communicationSocial && Array.isArray(ageGroup.communicationSocial)) {
        ageGroup.communicationSocial.forEach(milestone => {
          flatMilestones.push({
            milestone,
            category: 'social',
            expectedAge: startAge,
            ageRange
          });
        });
      }
    });
    
    // Filter milestones based on current age (show milestones for current age ± 3 months)
    return flatMilestones.filter(milestone => {
      const ageDiff = Math.abs(currentAge - milestone.expectedAge);
      return ageDiff <= 3; // Show milestones within 3 months of current age
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryIcon = (category) => {
    const cat = milestoneCategories.find(c => c.id === category);
    return cat ? cat.icon : '🎯';
  };

  const getCategoryColor = (category) => {
    const cat = milestoneCategories.find(c => c.id === category);
    return cat ? cat.color : 'gray';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'due':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Target className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-50 border-green-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'due':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const expectedMilestones = getExpectedMilestones();
  const achievedCount = milestones.length;
  const totalExpected = expectedMilestones.length;
  const progressPercentage = totalExpected > 0 ? (achievedCount / totalExpected) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Baby className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Developmental Milestones</h3>
            <p className="text-sm text-gray-600">Track your child's development progress</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Milestone</span>
        </button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Star className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Achieved</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{achievedCount}</div>
          <div className="text-xs text-purple-600">milestones completed</div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Expected</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{totalExpected}</div>
          <div className="text-xs text-blue-600">for current age</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Progress</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{Math.round(progressPercentage)}%</div>
          <div className="text-xs text-green-600">development rate</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Development Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Milestones by Category */}
      <div className="space-y-6">
        {milestoneCategories.map(category => {
          const categoryMilestones = expectedMilestones.filter(m => m.category === category.id);
          const achievedMilestones = milestones.filter(m => m.category === category.id);
          
          return (
            <div key={category.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">{category.icon}</span>
                <h4 className="font-medium text-gray-800">{category.name}</h4>
                <span className="text-sm text-gray-500">
                  ({achievedMilestones.length}/{categoryMilestones.length})
                </span>
              </div>

              <div className="space-y-3">
                {categoryMilestones.map((milestone, index) => {
                  const achieved = milestones.find(m => 
                    m.milestone === milestone.milestone && m.category === category.id
                  );
                  const status = getMilestoneStatus(milestone.expectedAge, achieved?.achieved_date);

                  return (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(status)}`}
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(status)}
                        <div>
                          <p className="font-medium text-gray-800">{milestone.milestone}</p>
                          <p className="text-sm text-gray-600">
                            Expected by {milestone.expectedAge} months
                            {achieved && ` • Achieved ${formatDate(achieved.achieved_date)}`}
                          </p>
                        </div>
                      </div>
                      
                      {achieved && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Achieved</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Milestones */}
      {milestones.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-800 mb-4">Custom Milestones</h4>
          <div className="space-y-3">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getCategoryIcon(milestone.category)}</span>
                  <div>
                    <p className="font-medium text-gray-800">{milestone.milestone}</p>
                    <p className="text-sm text-gray-600">
                      Achieved {formatDate(milestone.achieved_date)}
                      {milestone.notes && ` • ${milestone.notes}`}
                    </p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add Milestone</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Milestone Description
                </label>
                <input
                  type="text"
                  required
                  value={formData.milestone}
                  onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., First steps, First word, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {milestoneCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Achieved
                </label>
                <input
                  type="date"
                  required
                  value={formData.achievedDate}
                  onChange={(e) => setFormData({ ...formData, achievedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Any additional details..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTracker; 