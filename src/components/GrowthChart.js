import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Activity, Target, Baby } from 'lucide-react';
import { supabase } from '../lib/supabase';
import growthReferenceData from '../data/growth_reference.json';

const GrowthChart = ({ patientId, patientName, patientDOB, patientGender }) => {
  const [growthData, setGrowthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('height');

  useEffect(() => {
    loadGrowthData();
  }, [patientId]);

  const loadGrowthData = async () => {
    try {
      const { data, error } = await supabase
        .from('growth_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: true });

      if (error) throw error;
      setGrowthData(data || []);
    } catch (error) {
      console.error('Error loading growth data:', error);
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

  const getReferenceData = (metric) => {
    const gender = patientGender === 'Male' ? 'boys' : 'girls';
    const referenceData = growthReferenceData.growthChart[gender];
    
    return referenceData.map(item => {
      let value, min, avg, max;
      
      switch (metric) {
        case 'height':
          value = item.heightAvgCm;
          min = item.heightMinCm;
          avg = item.heightAvgCm;
          max = item.heightMaxCm;
          break;
        case 'weight':
          value = item.weightAvgKg;
          min = item.weightMinKg;
          avg = item.weightAvgKg;
          max = item.weightMaxKg;
          break;
        case 'head':
          value = item.headAvgCm;
          min = item.headMinCm;
          avg = item.headAvgCm;
          max = item.headMaxCm;
          break;
        default:
          value = item.heightAvgCm;
          min = item.heightMinCm;
          avg = item.heightAvgCm;
          max = item.heightMaxCm;
      }
      
      return {
        ageMonths: item.ageMonths,
        reference: value,
        min: min,
        avg: avg,
        max: max
      };
    });
  };

  const prepareChartData = () => {
    const referenceData = getReferenceData(selectedMetric);
    const patientData = growthData.map(record => {
      const recordDate = new Date(record.record_date);
      const birthDate = new Date(patientDOB);
      const ageInMonths = (recordDate.getFullYear() - birthDate.getFullYear()) * 12 + 
                         (recordDate.getMonth() - birthDate.getMonth());
      
      let patientValue;
      switch (selectedMetric) {
        case 'height':
          patientValue = record.height_cm;
          break;
        case 'weight':
          patientValue = record.weight_kg;
          break;
        case 'head':
          patientValue = record.head_circumference_cm;
          break;
        default:
          patientValue = record.height_cm;
      }
      
      return {
        ageMonths: ageInMonths,
        patient: patientValue,
        date: record.record_date
      };
    });

    // Combine reference data with patient data
    const combinedData = referenceData.map(ref => {
      const patientRecord = patientData.find(p => p.ageMonths === ref.ageMonths);
      return {
        ...ref,
        patient: patientRecord ? patientRecord.patient : null,
        date: patientRecord ? patientRecord.date : null
      };
    });

    return combinedData;
  };

  const getMetricInfo = () => {
    switch (selectedMetric) {
      case 'height':
        return {
          title: 'Height Growth Chart',
          unit: 'cm',
          color: '#3B82F6',
          icon: <TrendingUp className="w-5 h-5" />
        };
      case 'weight':
        return {
          title: 'Weight Growth Chart',
          unit: 'kg',
          color: '#10B981',
          icon: <Activity className="w-5 h-5" />
        };
      case 'head':
        return {
          title: 'Head Circumference Chart',
          unit: 'cm',
          color: '#8B5CF6',
          icon: <Target className="w-5 h-5" />
        };
      default:
        return {
          title: 'Height Growth Chart',
          unit: 'cm',
          color: '#3B82F6',
          icon: <TrendingUp className="w-5 h-5" />
        };
    }
  };

  const formatTooltip = (value, name) => {
    const metricInfo = getMetricInfo();
    if (name === 'patient') {
      return [`${value} ${metricInfo.unit}`, 'Patient'];
    } else if (name === 'reference') {
      return [`${value} ${metricInfo.unit}`, 'Reference (50th percentile)'];
    } else if (name === 'min') {
      return [`${value} ${metricInfo.unit}`, '3rd percentile'];
    } else if (name === 'max') {
      return [`${value} ${metricInfo.unit}`, '97th percentile'];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const chartData = prepareChartData();
  const metricInfo = getMetricInfo();
  const currentAge = calculateAge(patientDOB);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            {metricInfo.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{metricInfo.title}</h3>
            <p className="text-sm text-gray-600">
              {patientName} • {patientGender} • {currentAge} months old
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedMetric('height')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'height'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Height
          </button>
          <button
            onClick={() => setSelectedMetric('weight')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'weight'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Weight
          </button>
          <button
            onClick={() => setSelectedMetric('head')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedMetric === 'head'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Head
          </button>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="ageMonths" 
                label={{ value: 'Age (months)', position: 'insideBottom', offset: -10 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: `${metricInfo.title.split(' ')[0]} (${metricInfo.unit})`, angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={(label) => `Age: ${label} months`}
              />
              <Legend />
              
              {/* Reference lines for percentiles */}
              <Line 
                type="monotone" 
                dataKey="min" 
                stroke="#EF4444" 
                strokeWidth={1} 
                strokeDasharray="5 5" 
                dot={false}
                name="3rd percentile"
              />
              <Line 
                type="monotone" 
                dataKey="avg" 
                stroke="#6B7280" 
                strokeWidth={2} 
                dot={false}
                name="50th percentile"
              />
              <Line 
                type="monotone" 
                dataKey="max" 
                stroke="#EF4444" 
                strokeWidth={1} 
                strokeDasharray="5 5" 
                dot={false}
                name="97th percentile"
              />
              
              {/* Patient data line */}
              <Line 
                type="monotone" 
                dataKey="patient" 
                stroke={metricInfo.color} 
                strokeWidth={3} 
                dot={{ fill: metricInfo.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Patient"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Chart Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span className="text-gray-600">3rd & 97th percentiles</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-gray-500"></div>
              <span className="text-gray-600">50th percentile (average)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5" style={{ backgroundColor: metricInfo.color }}></div>
              <span className="text-gray-600">Patient measurements</span>
            </div>
          </div>

          {/* Patient Data Summary */}
          {growthData.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Patient Measurements</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {growthData.slice(-3).reverse().map((record, index) => {
                  let value;
                  switch (selectedMetric) {
                    case 'height':
                      value = record.height_cm;
                      break;
                    case 'weight':
                      value = record.weight_kg;
                      break;
                    case 'head':
                      value = record.head_circumference_cm;
                      break;
                    default:
                      value = record.height_cm;
                  }
                  
                  const recordDate = new Date(record.record_date);
                  const birthDate = new Date(patientDOB);
                  const ageInMonths = (recordDate.getFullYear() - birthDate.getFullYear()) * 12 + 
                                    (recordDate.getMonth() - birthDate.getMonth());
                  
                  return (
                    <div key={index} className="text-center">
                      <div className="text-lg font-bold" style={{ color: metricInfo.color }}>
                        {value} {metricInfo.unit}
                      </div>
                      <div className="text-sm text-gray-600">
                        {ageInMonths} months
                      </div>
                      <div className="text-xs text-gray-500">
                        {recordDate.toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Baby className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Growth Data Available</h3>
          <p className="text-gray-500">
            Add growth measurements to see the chart visualization.
          </p>
        </div>
      )}
    </div>
  );
};

export default GrowthChart; 