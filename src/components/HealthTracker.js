import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Baby, 
  Heart, 
  Eye, 
  Ear, 
  Apple, 
  Target, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import growthReferenceData from '../data/growth_reference.json';
import milestonesData from '../data/milestones.json';
import nutritionReferenceData from '../data/nutrition.json';
import GrowthChart from './GrowthChart';

const HealthTracker = ({ patientId, patientName, patientAge, patientDOB, patientGender }) => {
  const [growthData, setGrowthData] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [nutritionData, setNutritionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('growth');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadHealthData();
  }, [patientId]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      // Load growth data
      const { data: growth } = await supabase
        .from('growth_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: true });

      // Load milestones
      const { data: milestoneData } = await supabase
        .from('developmental_milestones')
        .select('*')
        .eq('patient_id', patientId)
        .order('achieved_date', { ascending: false });

      setGrowthData(growth || []);
      setMilestones(milestoneData || []);
      
      // Nutrition data is now loaded from JSON based on patient age
      setNutritionData([]);

    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (date) => {
    const today = new Date();
    const birthDate = new Date(date);
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (today.getMonth() - birthDate.getMonth());
    return ageInMonths;
  };

  const getLatestGrowthRecord = () => {
    if (growthData.length === 0) return null;
    return growthData[growthData.length - 1];
  };

  const getGrowthPercentile = (value, age, gender, type) => {
    const genderData = gender === 'Male' ? growthReferenceData.growthChart.boys : growthReferenceData.growthChart.girls;
    const ageData = genderData.find(d => d.ageMonths === age);
    
    if (!ageData) return 50; // Default to 50th percentile if age not found
    
    let min, avg, max;
    switch (type) {
      case 'weight':
        min = ageData.weightMinKg;
        avg = ageData.weightAvgKg;
        max = ageData.weightMaxKg;
        break;
      case 'height':
        min = ageData.heightMinCm;
        avg = ageData.heightAvgCm;
        max = ageData.heightMaxCm;
        break;
      case 'head':
        min = ageData.headMinCm;
        avg = ageData.headAvgCm;
        max = ageData.headMaxCm;
        break;
      default:
        return 50;
    }
    
    // Calculate percentile based on value position between min, avg, and max
    if (value <= min) return 3;
    if (value <= avg) {
      const range = avg - min;
      const position = value - min;
      return Math.round(3 + (position / range) * 47); // 3rd to 50th percentile
    }
    if (value <= max) {
      const range = max - avg;
      const position = value - avg;
      return Math.round(50 + (position / range) * 47); // 50th to 97th percentile
    }
    return 97;
  };

  const getMilestonesByAge = (ageInMonths) => {
    // Find the appropriate age group from milestones data
    const ageGroup = milestonesData.milestones.find(group => {
      const ageRange = group.ageRange;
      if (ageRange.includes('-')) {
        const [start, end] = ageRange.split('-').map(s => parseInt(s.split(' ')[0]));
        return ageInMonths >= start && ageInMonths <= end;
      } else {
        const singleAge = parseInt(ageRange.split(' ')[0]);
        return ageInMonths === singleAge;
      }
    });
    
    if (!ageGroup) return [];
    
    return [
      { category: 'Cognitive', items: ageGroup.cognitive || [] },
      { category: 'Motor Skills', items: [...(ageGroup.grossMotor || []), ...(ageGroup.fineMotor || [])] },
      { category: 'Social & Communication', items: ageGroup.communicationSocial || [] }
    ];
  };

  const getNutritionByAge = (ageInMonths) => {
    // Find the appropriate nutrition data for the patient's age
    const nutritionInfo = nutritionReferenceData.nutritionFeedingChart.find(item => 
      item.ageMonths === ageInMonths
    );
    
    // If exact age not found, find the closest age (for ages between defined months)
    if (!nutritionInfo) {
      const sortedAges = nutritionReferenceData.nutritionFeedingChart
        .map(item => item.ageMonths)
        .sort((a, b) => a - b);
      
      // Find the closest age that's less than or equal to the patient's age
      const closestAge = sortedAges
        .filter(age => age <= ageInMonths)
        .pop();
      
      if (closestAge !== undefined) {
        return nutritionReferenceData.nutritionFeedingChart.find(item => item.ageMonths === closestAge);
      }
    }
    
    return nutritionInfo || nutritionReferenceData.nutritionFeedingChart[0]; // Fallback to 0 months
  };

  const addHealthRecord = async (type) => {
    setModalType(type);
    setFormData({});
    setShowAddModal(true);
  };

  const saveHealthRecord = async () => {
    try {
      const tableName = modalType === 'growth' ? 'growth_records' : 
                       modalType === 'milestone' ? 'developmental_milestones' : 'growth_records';
      
      // Handle both old and new column structures
      const recordData = {
        patient_id: patientId,
        ...formData
      };

      // Add date fields for compatibility with both old and new table structures
      const currentDate = new Date().toISOString().split('T')[0];
      recordData.date = currentDate;
      recordData.record_date = currentDate;

      // Map old column names to new ones if needed
      if (formData.height_cm) {
        recordData.height = formData.height_cm; // Old column name
        recordData.height_cm = formData.height_cm; // New column name
      }
      if (formData.weight_kg) {
        recordData.weight = formData.weight_kg; // Old column name
        recordData.weight_kg = formData.weight_kg; // New column name
      }
      if (formData.head_circumference_cm) {
        recordData.head_circumference = formData.head_circumference_cm; // Old column name
        recordData.head_circumference_cm = formData.head_circumference_cm; // New column name
      }

      // Saving record data

      const { data, error } = await supabase
        .from(tableName)
        .insert([recordData]);

      if (error) throw error;

      setShowAddModal(false);
      loadHealthData();
    } catch (error) {
      console.error('Error saving health record:', error);
      console.error('Error details:', error.message, error.details, error.hint);
    }
  };

  const renderGrowthChart = () => {
    const latestRecord = getLatestGrowthRecord();
    const currentAge = calculateAge(patientDOB);
    const gender = patientGender || 'Male';
    
    // Get reference data for current age
    const genderData = gender === 'Male' ? growthReferenceData.growthChart.boys : growthReferenceData.growthChart.girls;
    const ageData = genderData.find(d => d.ageMonths === currentAge) || genderData[0];
    
    // Calculate percentiles for latest record
    const weightPercentile = latestRecord ? getGrowthPercentile(latestRecord.weight_kg, currentAge, gender, 'weight') : 50;
    const heightPercentile = latestRecord ? getGrowthPercentile(latestRecord.height_cm, currentAge, gender, 'height') : 50;
    const headPercentile = latestRecord ? getGrowthPercentile(latestRecord.head_circumference_cm, currentAge, gender, 'head') : 50;

    return (
      <div className="space-y-6">
        {/* Growth Tracking Cards */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Growth Tracking</h3>
            <button
              onClick={() => addHealthRecord('growth')}
              className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Height Chart */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-gray-900">Height</span>
                </div>
                <span className="text-sm text-gray-600">{heightPercentile}th percentile</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {latestRecord ? `${latestRecord.height_cm} cm` : `${ageData.heightAvgCm} cm`}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {latestRecord ? `Last updated: ${new Date(latestRecord.record_date).toLocaleDateString()}` : 'No measurements yet'}
              </div>
            </div>

            {/* Weight Chart */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-gray-900">Weight</span>
                </div>
                <span className="text-sm text-gray-600">{weightPercentile}th percentile</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {latestRecord ? `${latestRecord.weight_kg} kg` : `${ageData.weightAvgKg} kg`}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {latestRecord ? `Last updated: ${new Date(latestRecord.record_date).toLocaleDateString()}` : 'No measurements yet'}
              </div>
            </div>

            {/* Head Circumference */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Target className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="font-medium text-gray-900">Head Circ.</span>
                </div>
                <span className="text-sm text-gray-600">{headPercentile}th percentile</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {latestRecord ? `${latestRecord.head_circumference_cm} cm` : `${ageData.headAvgCm} cm`}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {latestRecord ? `Last updated: ${new Date(latestRecord.record_date).toLocaleDateString()}` : 'No measurements yet'}
              </div>
            </div>
          </div>

          {/* Growth History */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Recent Measurements</h4>
            <div className="space-y-2">
              {growthData.slice(0, 5).map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(record.record_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex space-x-6 text-sm">
                    <span>H: {record.height_cm}cm</span>
                    <span>W: {record.weight_kg}kg</span>
                    <span>HC: {record.head_circumference_cm}cm</span>
                  </div>
                </div>
              ))}
              {growthData.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No growth records available. Add your first measurement!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Growth Charts */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Growth Charts</h3>
          <GrowthChart 
            patientId={patientId}
            patientName={patientName}
            patientDOB={patientDOB}
            patientGender={patientGender}
          />
        </div>
      </div>
    );
  };

  const renderMilestones = () => {
    const currentAge = calculateAge(patientDOB);
    const ageMilestones = getMilestonesByAge(currentAge);

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Developmental Milestones</h3>
          <button
            onClick={() => addHealthRecord('milestone')}
            className="flex items-center px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ageMilestones.map((category, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Baby className="w-4 h-4 mr-2 text-green-600" />
                {category.category} Development
              </h4>
              <div className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Achieved Milestones */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Recently Achieved</h4>
          <div className="space-y-2">
            {milestones.slice(0, 5).map((milestone, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900">{milestone.milestone}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {new Date(milestone.achieved_date).toLocaleDateString()}
                </span>
              </div>
            ))}
            {milestones.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No milestones recorded yet. Start tracking your child's achievements!
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNutrition = () => {
    const currentAge = calculateAge(patientDOB);
    const nutritionInfo = getNutritionByAge(currentAge);
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Nutrition & Feeding</h3>
          <button
            onClick={() => addHealthRecord('nutrition')}
            className="flex items-center px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </button>
        </div>

        {/* Age-Specific Nutrition Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Feeding Type */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Apple className="w-5 h-5 text-orange-600 mr-2" />
              <span className="font-medium text-gray-900">Feeding Type</span>
            </div>
            <div className="text-lg font-semibold text-orange-600">
              {nutritionInfo.feedingType}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Age: {currentAge} months
            </div>
          </div>

          {/* Daily Meals */}
          {nutritionInfo.dailyMeals && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Clock className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-gray-900">Daily Meals</span>
              </div>
              <div className="text-lg font-semibold text-green-600">
                {nutritionInfo.dailyMeals} meals per day
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Recommended frequency
              </div>
            </div>
          )}
        </div>

        {/* Recommended Foods */}
        {nutritionInfo.recommendedFoods && nutritionInfo.recommendedFoods.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Target className="w-4 h-4 mr-2 text-green-600" />
              Recommended Foods
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {nutritionInfo.recommendedFoods.map((food, index) => (
                <div key={index} className="bg-green-50 rounded-lg p-3 text-center">
                  <span className="text-sm font-medium text-green-700 capitalize">
                    {food}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition Notes */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-blue-600" />
            Important Notes
          </h4>
          <div className="text-sm text-gray-700">
            {nutritionInfo.notes}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('growth')}
          className={`flex-shrink-0 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'growth'
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Growth Charts
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex-shrink-0 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'milestones'
              ? 'bg-green-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Milestones
        </button>
        <button
          onClick={() => setActiveTab('nutrition')}
          className={`flex-shrink-0 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'nutrition'
              ? 'bg-orange-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Nutrition
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'growth' && renderGrowthChart()}
      {activeTab === 'milestones' && renderMilestones()}
      {activeTab === 'nutrition' && renderNutrition()}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Add {modalType === 'growth' ? 'Growth' : modalType === 'milestone' ? 'Milestone' : 'Nutrition'} Record
            </h3>
            
            {modalType === 'growth' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.height_cm || ''}
                    onChange={(e) => setFormData({...formData, height_cm: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.weight_kg || ''}
                    onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Head Circumference (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.head_circumference_cm || ''}
                    onChange={(e) => setFormData({...formData, head_circumference_cm: e.target.value})}
                  />
                </div>
              </div>
            )}

            {modalType === 'milestone' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.milestone || ''}
                    onChange={(e) => setFormData({...formData, milestone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select category</option>
                    <option value="motor">Motor Skills</option>
                    <option value="cognitive">Cognitive</option>
                    <option value="social">Social & Emotional</option>
                    <option value="language">Language</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Achieved Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.achieved_date || ''}
                    onChange={(e) => setFormData({...formData, achieved_date: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveHealthRecord}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthTracker; 