import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, User, Clock, Calendar as CalendarIcon, Users, Syringe, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { IAP_SCHEDULE } from './VaccinationTable';

function getInitials(name) {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function CalendarSidebarPanel({ selectedDate, doctors, appointments, patients, currentUser, dueVaccinations, loadingVaccinations, onEditAppointment, onStatusCardClick, statusFilter }) {
  // Common state and hooks
  const today = new Date();
  const [expandedDoctors, setExpandedDoctors] = useState({});
  const [doctorSearch, setDoctorSearch] = useState('');

  // Memoized values for calculations
  const dateString = useMemo(() => {
    if (!selectedDate) return null;
    if (typeof selectedDate === 'string') return selectedDate.split('T')[0];
    return selectedDate.toLocaleDateString('en-CA');
  }, [selectedDate]);

  const todaysAppointments = useMemo(() => {
    if (!dateString) return [];
    return appointments.filter(appt => {
      let apptDate = typeof appt.date === 'string' ? appt.date.split('T')[0] : appt.date?.toLocaleDateString('en-CA');
      return apptDate === dateString;
    });
  }, [appointments, dateString]);

  const statusCountsToday = useMemo(() => {
    const counts = { scheduled: 0, checked_in: 0, completed: 0, cancelled: 0 };
    todaysAppointments.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [todaysAppointments]);

  const nextDayAppointments = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;
    return appointments.filter(a => {
      let apptDateStr = typeof a.date === 'string' ? a.date.split('T')[0] : a.date?.toLocaleDateString('en-CA');
      return apptDateStr === tomorrowStr;
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments]);

  const dueByPatient = useMemo(() => {
    const map = {};
    dueVaccinations.forEach(item => {
      if (!map[item.patient_id]) {
        map[item.patient_id] = {
          patient_name: item.patient_name,
          vaccines: []
        };
        }
      map[item.patient_id].vaccines.push({
        vaccine: item.vaccine,
        due_date: item.due_date
      });
    });
    return Object.values(map);
  }, [dueVaccinations]);

  const filteredDoctors = doctors.filter(d => d.full_name.toLowerCase().includes(doctorSearch.toLowerCase()));

  // Handlers
  const handleExpandAll = () => setExpandedDoctors(Object.fromEntries(doctors.map(d => [d.id, true])));
  const handleCollapseAll = () => setExpandedDoctors(Object.fromEntries(doctors.map(d => [d.id, false])));
  
  // Collapsible section states
  const [expandedTomorrowSection, setExpandedTomorrowSection] = useState(true);
  const [expandedDoctorsSection, setExpandedDoctorsSection] = useState(true);
  const [expandedAppointmentsSection, setExpandedAppointmentsSection] = useState(true); // Added for legacy/doctor view
  
  // Helpers
  const getPatientName = useCallback((id) => patients.find(p => p.id === id)?.name || id, [patients]);
  const getDoctorName = useCallback((id) => doctors.find(d => d.id === id)?.full_name || id, [doctors]);
  const statusClass = useCallback((status) => {
    if (status === 'scheduled') return 'bg-green-100 text-green-700';
    if (status === 'checked_in') return 'bg-yellow-100 text-yellow-700';
    if (status === 'completed') return 'bg-gray-200 text-gray-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  }, []);

  // Helper for card highlight
  const isActive = (status) => statusFilter === status || (status === null && !statusFilter);

  // Doctor-specific hooks and data
  const myAppointments = useMemo(() => {
    if (currentUser?.role !== 'doctor') return [];
    return appointments.filter(a => a.user_id === currentUser.id);
  }, [appointments, currentUser]);

  const appointmentsThisMonth = useMemo(() => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return appointments.filter(a => {
      const apptDate = new Date(typeof a.date === 'string' ? a.date.split('T')[0] : a.date);
      return apptDate >= monthStart && apptDate < firstDayOfNextMonth;
    });
  }, [appointments, today]);
  
  const myAppointmentsThisMonth = useMemo(() => {
    if (currentUser?.role !== 'doctor') return [];
    return appointmentsThisMonth.filter(a => a.user_id === currentUser.id);
  }, [appointmentsThisMonth, currentUser]);

  const statusCountsMonth = useMemo(() => {
    const counts = { scheduled: 0, checked_in: 0, completed: 0, cancelled: 0 };
    myAppointmentsThisMonth.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [myAppointmentsThisMonth]);

  // Main UI
  if (!currentUser) return null; // Or a loading state

  // Unified Support/Admin Sidebar
  if (currentUser.role === 'support' || currentUser.role === 'admin') {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 rounded-2xl shadow-2xl p-0 flex flex-col h-full min-h-[600px] font-sans">
        {/* Welcome Section */}
        <div className="flex items-center gap-4 p-6 pb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {getInitials(currentUser.full_name)}
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              Good {(() => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; })()}, {currentUser.full_name.split(' ')[0]}
            </div>
            <div className="text-sm text-blue-700 capitalize">{currentUser.role}</div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Daily Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`bg-white rounded-xl shadow p-4 flex flex-col items-center cursor-pointer border-2 transition-all ${isActive(null) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}
              onClick={() => onStatusCardClick && onStatusCardClick(null)}
            >
            <CalendarIcon className="w-8 h-8 text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-blue-700">{todaysAppointments.length}</div>
              <div className="text-xs text-blue-600">Total (Today)</div>
          </div>
            <div
              className={`bg-green-50 rounded-xl shadow p-4 flex flex-col items-center cursor-pointer border-2 transition-all ${isActive('scheduled') ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent'}`}
              onClick={() => onStatusCardClick && onStatusCardClick('scheduled')}
            >
            <Clock className="w-8 h-8 text-green-400 mb-2" />
              <div className="text-lg font-bold text-green-700">{statusCountsToday.scheduled || 0}</div>
              <div className="text-xs text-green-600">Scheduled</div>
          </div>
            <div
              className={`bg-yellow-50 rounded-xl shadow p-4 flex flex-col items-center cursor-pointer border-2 transition-all ${isActive('checked_in') ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-transparent'}`}
              onClick={() => onStatusCardClick && onStatusCardClick('checked_in')}
            >
            <User className="w-8 h-8 text-yellow-400 mb-2" />
              <div className="text-lg font-bold text-yellow-700">{statusCountsToday.checked_in || 0}</div>
              <div className="text-xs text-yellow-600">Checked-in</div>
          </div>
            <div
              className={`bg-gray-50 rounded-xl shadow p-4 flex flex-col items-center cursor-pointer border-2 transition-all ${isActive('completed') ? 'border-gray-500 ring-2 ring-gray-200' : 'border-transparent'}`}
              onClick={() => onStatusCardClick && onStatusCardClick('completed')}
            >
            <Users className="w-8 h-8 text-gray-400 mb-2" />
              <div className="text-lg font-bold text-gray-700">{statusCountsToday.completed || 0}</div>
              <div className="text-xs text-gray-600">Completed</div>
          </div>
            <div
              className={`bg-red-50 rounded-xl shadow p-4 flex flex-col items-center col-span-2 cursor-pointer border-2 transition-all ${isActive('cancelled') ? 'border-red-500 ring-2 ring-red-200' : 'border-transparent'}`}
              onClick={() => onStatusCardClick && onStatusCardClick('cancelled')}
            >
            <span className="inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold text-base">!</span>
                <span className="text-lg font-bold text-red-700">{statusCountsToday.cancelled || 0}</span>
            </span>
              <div className="text-xs text-red-600">Cancelled</div>
        </div>
          </div>

        {/* Tomorrow's Appointments */}
          <div className="bg-gradient-to-br from-blue-100 to-white rounded-2xl shadow-lg p-4">
            <button
              className="w-full flex items-center justify-between text-lg font-bold text-blue-900"
              onClick={() => setExpandedTomorrowSection(v => !v)}
            >
              <span className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-500" />
                Tomorrow's Appointments
              </span>
              {expandedTomorrowSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${expandedTomorrowSection ? 'max-h-[1000px] pt-4' : 'max-h-0'}`}>
              {nextDayAppointments.length > 0 ? (
                <ul className="divide-y divide-blue-100">
                  {nextDayAppointments.map(appt => (
                    <li key={appt.id} className="flex items-center gap-3 py-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-blue-800">{appt.time?.slice(0,5)}</span>
                <span className="text-gray-700">{getPatientName(appt.patient_id)}</span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${statusClass(appt.status)}`}>{appt.status}</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-gray-400 text-sm pt-2">No appointments for tomorrow</div>}
              </div>
          </div>
          
          {/* Vaccination Reminders */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-4">
             <button
              className="w-full flex items-center justify-between text-lg font-bold text-green-900"
              onClick={() => setExpandedDoctors(prev => ({ ...prev, _vacc: !prev._vacc }))}
            >
              <span className="flex items-center gap-2">
                <Syringe className="w-6 h-6 text-green-500" />
                Due for Vaccination
              </span>
              {expandedDoctors._vacc ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${expandedDoctors._vacc ? 'max-h-[1000px] pt-4' : 'max-h-0'}`}>
              {loadingVaccinations ? <div className="text-gray-400 text-sm pt-2">Loading...</div> : 
               dueByPatient.length > 0 ? (
                <ul className="divide-y divide-green-100">
                  {dueByPatient.map((patient, idx) => (
                    <li key={idx} className="py-2">
                      <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400" />
                        {patient.patient_name}
        </div>
                      <ul className="ml-6 list-disc list-inside">
                        {patient.vaccines.map((v, vIdx) => (
                          <li key={vIdx} className="text-sm text-emerald-800 flex items-center gap-2 py-1">
                            <span>{v.vaccine} ({v.due_date})</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-gray-400 text-sm pt-2">No patients due for vaccination</div>}
            </div>
          </div>

          {/* Doctors' Appointments */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <button
                className="flex items-center gap-2 text-xl font-bold text-blue-900"
                onClick={() => setExpandedDoctorsSection(v => !v)}
                aria-label="Toggle Doctors' Appointments section"
              >
                Doctors' Appointments
                {expandedDoctorsSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-500 ${expandedDoctorsSection ? 'max-h-[2000px] py-2' : 'max-h-0'}`}> 
              {expandedDoctorsSection && (
                <>
                  <div className="flex gap-2 mb-2">
                    <button onClick={handleExpandAll} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shadow hover:bg-blue-200 transition">Expand All</button>
                    <button onClick={handleCollapseAll} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold shadow hover:bg-gray-200 transition">Collapse All</button>
              </div>
                  <input
                    type="text"
                    placeholder="Search doctor..."
                    value={doctorSearch}
                    onChange={e => setDoctorSearch(e.target.value)}
                    className="w-full my-2 px-4 py-2 rounded-full border border-blue-200 shadow-sm"
                  />
                  <ul className="space-y-2">
                    {filteredDoctors.map(doctor => {
                      const doctorAppointments = todaysAppointments.filter(a => a.user_id === doctor.id);
                      const isExpanded = expandedDoctors[doctor.id] !== false; // Default to true
                      return (
                        <li key={doctor.id} className="bg-white rounded-xl shadow p-0">
                          <button onClick={() => setExpandedDoctors(p => ({...p, [doctor.id]: !isExpanded}))} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-blue-50 transition">
                            <span className="font-bold text-blue-800 flex items-center gap-2">
                              <User className="w-5 h-5 text-blue-400" />
                              {doctor.full_name}
                            </span>
                            <span className="flex items-center gap-2 text-sm">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{doctorAppointments.length} appts</span>
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </span>
                          </button>
                          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] p-4' : 'max-h-0'}`}> 
                            {doctorAppointments.length > 0 ? (
                              <ul className="divide-y divide-gray-100">
                                {doctorAppointments.map(appt => (
                                  <li key={appt.id} className="flex items-center gap-3 py-2 bg-blue-50 rounded-xl shadow-sm my-2 px-3">
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    <span className="font-semibold text-blue-800">{appt.time.slice(0,5)}</span>
                                    <span className="text-gray-700">{getPatientName(appt.patient_id)}</span>
                                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(appt.status)}`}>{appt.status}</span>
                                    {onEditAppointment && (
                                      <button
                                        className="ml-2 p-1 rounded hover:bg-blue-200 transition"
                                        title="Edit Appointment"
                                        onClick={() => onEditAppointment(appt)}
                                      >
                                        <Pencil className="w-4 h-4 text-blue-600" />
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-gray-400 text-sm text-center py-2">No appointments</div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default/Legacy view if no role matches, or for other roles
  return (
    <div className="bg-white rounded-2xl shadow-lg p-0 flex flex-col h-full min-h-[600px]">
      {/* Summary Section */}
      <div className="p-6 pb-0">
        <h2 className="text-lg font-bold mb-4 text-blue-800">Summary for {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}</h2>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div
            className={`bg-blue-50 rounded-lg p-3 text-center cursor-pointer border-2 transition-all ${isActive(null) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}
            onClick={() => onStatusCardClick && onStatusCardClick(null)}
          >
            <div className="text-2xl font-bold text-blue-700">{todaysAppointments.length}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div
            className={`bg-green-50 rounded-lg p-3 text-center cursor-pointer border-2 transition-all ${isActive('scheduled') ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent'}`}
            onClick={() => onStatusCardClick && onStatusCardClick('scheduled')}
          >
            <div className="text-lg font-bold text-green-700">{statusCountsToday.scheduled || 0}</div>
            <div className="text-xs text-green-600">Scheduled</div>
          </div>
          <div
            className={`bg-yellow-50 rounded-lg p-3 text-center cursor-pointer border-2 transition-all ${isActive('checked_in') ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-transparent'}`}
            onClick={() => onStatusCardClick && onStatusCardClick('checked_in')}
          >
            <div className="text-lg font-bold text-yellow-700">{statusCountsToday.checked_in || 0}</div>
            <div className="text-xs text-yellow-600">Checked-in</div>
          </div>
          <div
            className={`bg-gray-50 rounded-lg p-3 text-center cursor-pointer border-2 transition-all ${isActive('completed') ? 'border-gray-500 ring-2 ring-gray-200' : 'border-transparent'}`}
            onClick={() => onStatusCardClick && onStatusCardClick('completed')}
          >
            <div className="text-lg font-bold text-gray-700">{statusCountsToday.completed || 0}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div
            className={`bg-red-50 rounded-lg p-3 text-center cursor-pointer border-2 transition-all ${isActive('cancelled') ? 'border-red-500 ring-2 ring-red-200' : 'border-transparent'}`}
            onClick={() => onStatusCardClick && onStatusCardClick('cancelled')}
          >
            <div className="text-lg font-bold text-red-700">{statusCountsToday.cancelled || 0}</div>
            <div className="text-xs text-red-600">Cancelled</div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="p-6 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-2 mt-4">
              <button
            className="flex items-center gap-2 text-lg font-bold text-blue-800"
                onClick={() => setExpandedAppointmentsSection(v => !v)}
              >
                Appointments ({todaysAppointments.length})
                <span>{expandedAppointmentsSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
              </button>
            </div>
        <div className={`overflow-hidden transition-all duration-500 ${expandedAppointmentsSection ? 'max-h-[2000px] py-2' : 'max-h-0'}`}>
          {todaysAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {todaysAppointments
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map(appt => (
                        <div key={appt.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl shadow-sm">
                          <span className="font-semibold text-blue-800">{appt.time?.slice(0,5)}</span>
                          <span className="text-gray-700">{getPatientName(appt.patient_id)}</span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(appt.status)}`}>{appt.status}</span>
                  </div>
                ))}
            </div>
          ) : <div className="text-gray-400 text-sm">No appointments for this date</div>}
          </div>
      </div>
    </div>
  );
}

export default CalendarSidebarPanel; 