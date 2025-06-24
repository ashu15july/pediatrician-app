// src/components/VaccinationTable.js
import React, { useEffect, useState } from 'react';
import { getVaccinations, upsertVaccination } from '../services/patientService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Check } from 'lucide-react';

const IAP_SCHEDULE = [
  { age: 'BIRTH', vaccines: ['BCG', 'OPV (0)', 'Hepatitis B (1)'] },
  { age: '6 weeks', vaccines: ['Hepatitis B (2)', 'DTPw / DTaP (1)', 'HIB (1)', 'IPV (1)', 'Pneumococcal - PCV (1)', 'Rotavirus (1)'] },
  { age: '10 weeks', vaccines: ['DTPw / DTaP (2)', 'HIB (2)', 'IPV (2)', 'Pneumococcal - PCV (2)', 'Rotavirus (2)'] },
  { age: '14 weeks', vaccines: ['DTPw / DTaP (3)', 'HIB (3)', 'IPV (3)', 'Pneumococcal - PCV (3)', 'Rotavirus (3)'] },
  { age: '6mo', vaccines: ['Hepatitis B (3) + OPV (1)'] },
  { age: '9 mo', vaccines: ['M.M.R. (1) + OPV (2)'] },
  { age: '12 mo', vaccines: ['Hepatitis A (1)'] },
  { age: '15 mo', vaccines: ['M.M.R. (2) + Varicella (1)', 'Pneumo. - PCV Booster'] },
  { age: '16-18 mo', vaccines: ['DTPw / DTaP (B1)', 'HIB (B1)', 'IPV (B1)'] },
  { age: '18 mo', vaccines: ['Hepatitis A (2)'] },
  { age: '2 yrs', vaccines: ['Typhoid (every 3 yrs)'] },
  { age: '4-6 yrs', vaccines: ['DTPw / DTaP (B2)+OPV(3)', 'Varicella (2)', 'Typhoid (2)'] },
  { age: '10-12 yrs', vaccines: ['Td / Tdap', 'HPV (0, 1-2 mo, 6 mo)'] },
];

const VaccinationTable = ({ patientId, patientName, patientAge, guardianName, patientDOB }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [dirtyRecords, setDirtyRecords] = useState({});

  // Function to calculate due date based on age requirement
  const calculateDueDate = (ageRequirement) => {
    if (!patientDOB) return '';
    
    const dob = new Date(patientDOB);
    let dueDate = new Date(dob);

    if (ageRequirement === 'BIRTH') {
      return dob.toISOString().split('T')[0];
    }

    // Parse the age requirement
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

  useEffect(() => {
    if (patientId) {
      setLoading(true);
      getVaccinations(patientId)
        .then(fetchedRecords => {
          // Initialize records with calculated due dates
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
          alert('Error fetching vaccination data: ' + (err.message || JSON.stringify(err)));
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
      // Mark this record as dirty
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
      alert('Error saving vaccination: ' + (err.message || JSON.stringify(err)));
    }
  };

  const getRecord = (age, vaccine) =>
    records.find((r) => r.age_label === age && r.vaccine === vaccine) || {
      age_label: age,
      vaccine,
      due_date: '',
      given_date: '',
      lot_no: '',
    };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Vaccination Chart', 14, 16);
    doc.setFontSize(12);
    doc.text(`Patient: ${patientName}`, 14, 26);
    doc.text(`Age: ${patientAge}`, 14, 34);
    doc.text(`Guardian: ${guardianName}`, 14, 42);

    const tableColumn = ['Age', 'Vaccine', 'Due Date', 'Given Date', 'Lot No.'];
    const tableRows = [];

    IAP_SCHEDULE.forEach(({ age, vaccines }) => {
      vaccines.forEach((vaccine) => {
        const rec = getRecord(age, vaccine);
        tableRows.push([
          age,
          vaccine,
          rec.due_date || '',
          rec.given_date || '',
          rec.lot_no || '',
        ]);
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`Vaccination_Chart_${patientName.replace(/ /g, '_')}.pdf`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="overflow-x-auto">
      {showSaved && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 animate-fade-in">
          <Check className="w-5 h-5" /> Vaccination details saved!
        </div>
      )}
      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={exportToPDF}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
        >
          Export as PDF
        </button>
        <button
          onClick={handleSaveAll}
          className={`bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 ${Object.keys(dirtyRecords).length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={Object.keys(dirtyRecords).length === 0}
        >
          Save All Changes
        </button>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-2xl shadow-lg p-6 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-blue-100 dark:divide-gray-800">
          <thead className="bg-blue-100 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">Age</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">Vaccine</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">Due Date</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">Given Date</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">Lot No.</th>
            </tr>
          </thead>
          <tbody>
            {IAP_SCHEDULE.map(({ age, vaccines }, groupIdx) => (
              <React.Fragment key={age}>
                <tr>
                  <td colSpan={5} className="px-4 py-2 font-bold text-blue-800 dark:text-blue-200 text-sm border-t-2 border-blue-200 dark:border-gray-700 bg-gradient-to-r from-blue-100 to-emerald-100 dark:bg-blue-900">
                    {age}
                  </td>
                </tr>
                {vaccines.map((vaccine, idx) => {
                  const rec = getRecord(age, vaccine);
                  return (
                    <tr key={age + vaccine} className={idx % 2 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-900'}>
                      <td className="px-4 py-2 align-top w-32 text-gray-700 dark:text-gray-200">{age}</td>
                      <td className="px-4 py-2 align-top font-medium text-gray-800 dark:text-gray-100">{vaccine}</td>
                      <td className="px-4 py-2 align-top">
                        <input
                          type="date"
                          value={rec.due_date ? rec.due_date.substring(0, 10) : ''}
                          onChange={(e) => handleChange(age, vaccine, 'due_date', e.target.value)}
                          className="border rounded-full px-3 py-1 w-full focus:ring-2 focus:ring-blue-200 shadow-sm dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                        />
                      </td>
                      <td className="px-4 py-2 align-top">
                        <input
                          type="date"
                          value={rec.given_date ? rec.given_date.substring(0, 10) : ''}
                          onChange={(e) => handleChange(age, vaccine, 'given_date', e.target.value)}
                          className="border rounded-full px-3 py-1 w-full focus:ring-2 focus:ring-emerald-200 shadow-sm dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                        />
                      </td>
                      <td className="px-4 py-2 align-top">
                        <input
                          type="text"
                          value={rec.lot_no || ''}
                          onChange={(e) => handleChange(age, vaccine, 'lot_no', e.target.value)}
                          className="border rounded-full px-3 py-1 w-40 md:w-60 lg:w-72 focus:ring-2 focus:ring-blue-100 shadow-sm dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                          placeholder="Enter lot number"
                        />
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VaccinationTable;