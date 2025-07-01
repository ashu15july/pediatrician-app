import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, User, Clock, Calendar as CalendarIcon, Users, Syringe } from 'lucide-react';
import { supabase } from '../lib/supabase';

function getInitials(name) {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function CalendarSidebarPanel({ selectedDate, doctors, appointments, patients, currentUser }) {
  // Move these to the top so they're available for all hooks below
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [activeTab, setActiveTab] = useState('appointments');
  const [dueVaccinations, setDueVaccinations] = useState([]);
  const [loadingVaccinations, setLoadingVaccinations] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState({});
  const [doctorSearch, setDoctorSearch] = useState('');
  const allExpanded = Object.values(expandedDoctors).every(Boolean);
  const noneExpanded = Object.values(expandedDoctors).every(v => !v);
  const handleExpandAll = () => setExpandedDoctors(Object.fromEntries(doctors.map(d => [d.id, true])));
  const handleCollapseAll = () => setExpandedDoctors(Object.fromEntries(doctors.map(d => [d.id, false])));
  const filteredDoctors = doctors.filter(d => d.full_name.toLowerCase().includes(doctorSearch.toLowerCase()));

  // Format selected date as YYYY-MM-DD
  const dateString = useMemo(() => {
    if (!selectedDate) return null;
    if (typeof selectedDate === 'string') return selectedDate.split('T')[0];
    return selectedDate.toLocaleDateString('en-CA');
  }, [selectedDate]);

  // Filter appointments for the selected date
  const todaysAppointments = useMemo(() => {
    if (!dateString) return [];
    return appointments.filter(appt => {
      let apptDate = typeof appt.date === 'string' ? appt.date.split('T')[0] : appt.date?.toLocaleDateString('en-CA');
      return apptDate === dateString;
    });
  }, [appointments, dateString]);

  // For doctor: filter only their appointments
  const myAppointments = useMemo(() => {
    if (currentUser?.role === 'doctor') {
      return appointments.filter(a => a.user_id === currentUser.id);
    }
    return appointments;
  }, [appointments, currentUser]);

  // Get current month range
  const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  // Filter all appointments for the current month
  const appointmentsThisMonth = useMemo(() => {
    return appointments.filter(a => {
      const apptDate = new Date(typeof a.date === 'string' ? a.date.split('T')[0] : a.date);
      return apptDate >= monthStart && apptDate < firstDayOfNextMonth;
    });
  }, [appointments, monthStart, firstDayOfNextMonth]);

  // For doctor: filter only their appointments for this month
  const myAppointmentsThisMonth = useMemo(() => {
    if (currentUser?.role !== 'doctor') return [];
    return appointmentsThisMonth.filter(a => a.user_id === currentUser.id);
  }, [appointmentsThisMonth, currentUser]);

  // Monthly status counts for doctor's appointments
  const statusCountsMonth = useMemo(() => {
    const counts = { scheduled: 0, checked_in: 0, completed: 0, cancelled: 0 };
    myAppointmentsThisMonth.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [myAppointmentsThisMonth]);

  // Get unique patient IDs for this doctor
  const myPatientIds = useMemo(() => {
    if (currentUser?.role !== 'doctor') return [];
    const ids = new Set();
    myAppointments.forEach(a => ids.add(a.patient_id));
    return Array.from(ids);
  }, [myAppointments, currentUser]);

  // Fetch due vaccinations for doctor's patients
  useEffect(() => {
    if (currentUser?.role !== 'doctor' || myPatientIds.length === 0) {
      setDueVaccinations([]);
      return;
    }
    setLoadingVaccinations(true);
    const fetchVaccinations = async () => {
      // Fetch all vaccinations for all patients in one batch
      const { data, error } = await supabase
        .from('vaccinations')
        .select('id, patient_id, vaccine, due_date, given_date')
        .in('patient_id', myPatientIds);
      if (error) {
        setDueVaccinations([]);
        setLoadingVaccinations(false);
        return;
      }
      const today = new Date();
      const in7Days = new Date();
      in7Days.setDate(today.getDate() + 7);
      // For each patient, find vaccines due in next 7 days and not given
      const dueList = [];
      data.forEach(rec => {
        if (!rec.due_date || rec.given_date) return;
        const due = new Date(rec.due_date);
        if (due >= today && due <= in7Days) {
          dueList.push(rec);
        }
      });
      setDueVaccinations(dueList);
      setLoadingVaccinations(false);
    };
    fetchVaccinations();
  }, [currentUser, myPatientIds]);

  // Upcoming appointments: only tomorrow's appointments for doctor
  const tomorrowsAppointments = useMemo(() => {
    if (currentUser?.role !== 'doctor') return [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;
    return myAppointments.filter(a => {
      let apptDateStr = typeof a.date === 'string' ? a.date.split('T')[0] : a.date?.toLocaleDateString('en-CA');
      return apptDateStr === tomorrowStr;
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [myAppointments, currentUser]);

  // Patient stats for doctor: seen today, this week, this month (unique patients, completed appointments)
  const patientStats = useMemo(() => {
    if (currentUser?.role !== 'doctor') return { seenToday: 0, seenThisWeek: 0, seenThisMonth: 0 };
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    // Unique patient IDs for each period
    const seenTodaySet = new Set();
    const seenThisWeekSet = new Set();
    const seenThisMonthSet = new Set();
    myAppointmentsThisMonth.forEach(a => {
      if (a.status === 'completed') {
        const apptDate = new Date(typeof a.date === 'string' ? a.date.split('T')[0] : a.date);
        if (apptDate.toDateString() === today.toDateString()) {
          seenTodaySet.add(a.patient_id);
        }
        if (apptDate >= weekStart && apptDate <= today) {
          seenThisWeekSet.add(a.patient_id);
        }
        seenThisMonthSet.add(a.patient_id);
      }
    });
    return {
      seenToday: seenTodaySet.size,
      seenThisWeek: seenThisWeekSet.size,
      seenThisMonth: seenThisMonthSet.size
    };
  }, [myAppointmentsThisMonth, currentUser]);

  // Patients due for follow-up: based on followup appointments in next 7 days
  const followUpAppointments = useMemo(() => {
    if (currentUser?.role !== 'doctor') return [];
    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);
    return appointments.filter(a =>
      a.user_id === currentUser.id &&
      a.type === 'followup' &&
      (a.status === 'scheduled' || a.status === 'checked_in') &&
      (() => {
        const apptDate = new Date(typeof a.date === 'string' ? a.date.split('T')[0] : a.date);
        return apptDate >= today && apptDate <= in7Days;
      })()
    );
  }, [appointments, currentUser]);

  // Helper to get patient name - memoized
  const getPatientName = useCallback((id) => {
    const p = patients.find(p => p.id === id);
    return p ? p.name : id;
  }, [patients]);

  // Helper to get doctor name - memoized
  const getDoctorName = useCallback((id) => {
    const d = doctors.find(d => d.id === id);
    return d ? d.full_name : id;
  }, [doctors]);

  // Status badge color - memoized
  const statusClass = useCallback((status) => {
    if (status === 'scheduled') return 'bg-green-100 text-green-700';
    if (status === 'checked_in') return 'bg-yellow-100 text-yellow-700';
    if (status === 'completed') return 'bg-gray-200 text-gray-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  }, []);

  // Monthly status counts for all appointments
  const statusCountsMonthAll = useMemo(() => {
    const counts = { scheduled: 0, checked_in: 0, completed: 0, cancelled: 0 };
    appointmentsThisMonth.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [appointmentsThisMonth]);

  // Add a count for today's scheduled appointments
  const scheduledTodayCount = useMemo(() => {
    return todaysAppointments.filter(a => a.status === 'scheduled').length;
  }, [todaysAppointments]);

  // Make the 'Doctors' Appointments' section collapsible
  const [expandedDoctorsSection, setExpandedDoctorsSection] = useState(true);

  // Add state for collapsing the Appointments section (all users)
  const [expandedAppointmentsSection, setExpandedAppointmentsSection] = useState(true);

  // Modern doctor sidebar UI
  if (currentUser?.role === 'doctor') {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 rounded-2xl shadow-2xl p-0 flex flex-col h-full min-h-[600px] font-sans">
        {/* Welcome & Avatar */}
        <div className="flex items-center gap-4 p-6 pb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {getInitials(currentUser.full_name)}
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              Good {(() => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; })()}, {
                currentUser.full_name.trim().toLowerCase().startsWith('dr.')
                  ? currentUser.full_name
                  : `Dr. ${currentUser.full_name.split(' ')[0]}`
              }
            </div>
            <div className="text-sm text-blue-700">Pediatrician</div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 px-6 mt-2 mb-4">
          <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
            <CalendarIcon className="w-8 h-8 text-blue-400 mb-2" />
            <div className="text-2xl font-bold text-blue-700">{myAppointmentsThisMonth.length}</div>
            <div className="text-xs text-blue-600">Total (This Month)</div>
          </div>
          <div className="bg-green-50 rounded-xl shadow p-4 flex flex-col items-center">
            <Clock className="w-8 h-8 text-green-400 mb-2" />
            <div className="text-lg font-bold text-green-700">{scheduledTodayCount}</div>
            <div className="text-xs text-green-600">Scheduled (Today)</div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow p-4 flex flex-col items-center">
            <User className="w-8 h-8 text-yellow-400 mb-2" />
            <div className="text-lg font-bold text-yellow-700">{statusCountsMonth.checked_in || 0}</div>
            <div className="text-xs text-yellow-600">Checked-in (This Month)</div>
          </div>
          <div className="bg-gray-50 rounded-xl shadow p-4 flex flex-col items-center">
            <Users className="w-8 h-8 text-gray-400 mb-2" />
            <div className="text-lg font-bold text-gray-700">{statusCountsMonth.completed || 0}</div>
            <div className="text-xs text-gray-600">Completed (This Month)</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow p-4 flex flex-col items-center col-span-2">
            <span className="inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold text-base">!</span>
              <span className="text-lg font-bold text-red-700">{statusCountsMonth.cancelled || 0}</span>
            </span>
            <div className="text-xs text-red-600">Cancelled (This Month)</div>
          </div>
        </div>
        {/* Personal Stats */}
        <div className="px-6 mb-4">
          <div className="bg-gradient-to-r from-blue-100 to-emerald-100 rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-blue-900 font-semibold">Patients seen today:</div>
            <div className="text-2xl font-bold text-blue-700">{patientStats.seenToday}</div>
            <div className="text-blue-900 font-semibold">This week:</div>
            <div className="text-2xl font-bold text-blue-700">{patientStats.seenThisWeek}</div>
            <div className="text-blue-900 font-semibold">This month:</div>
            <div className="text-2xl font-bold text-blue-700">{patientStats.seenThisMonth}</div>
          </div>
        </div>
        {/* Tomorrow's Appointments */}
        <div className="px-6 mb-4">
          <div className="bg-white rounded-xl shadow-lg p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-6 h-6 text-blue-500" />
              <div className="text-lg font-bold text-blue-900">Tomorrow's Appointments</div>
            </div>
            {tomorrowsAppointments.length === 0 ? (
              <div className="text-gray-400 text-sm">No appointments for tomorrow</div>
            ) : tomorrowsAppointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-blue-800">{appt.time?.slice(0,5)}</span>
                <span className="text-gray-700">{getPatientName(appt.patient_id)}</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(appt.status)}`}>{appt.status}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Patients Due for Vaccination */}
        <div className="px-6 mb-4">
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl shadow-lg p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <Syringe className="w-6 h-6 text-green-500" />
              <div className="text-lg font-bold text-green-900">Patients Due for Vaccination (Next 7 Days)</div>
            </div>
            {loadingVaccinations ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : dueVaccinations.length === 0 ? (
              <div className="text-gray-400 text-sm">No patients due for vaccination</div>
            ) : dueVaccinations.map(rec => (
              <div key={rec.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-50 transition">
                <Syringe className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-green-800">{getPatientName(rec.patient_id)}</span>
                <span className="text-xs text-green-700">{rec.vaccine}</span>
                <span className="text-xs text-green-700">Due: {rec.due_date}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Patients Due for Follow-up */}
        <div className="px-6 mb-4">
          <div className="bg-gradient-to-r from-yellow-100 to-blue-100 rounded-xl shadow-lg p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-6 h-6 text-yellow-500" />
              <div className="text-lg font-bold text-yellow-900">Patients Due for Follow-up (Next 7 Days)</div>
            </div>
            {followUpAppointments.length === 0 ? (
              <div className="text-gray-400 text-sm">No patients due for follow-up</div>
            ) : followUpAppointments.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-yellow-50 transition">
                <User className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-yellow-800">{getPatientName(a.patient_id)}</span>
                <span className="text-xs text-yellow-700">Follow-up: {a.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-0 flex flex-col h-full min-h-[600px]">
      {/* Summary Section */}
      <div className="p-6 pb-0">
        <h2 className="text-lg font-bold mb-4 text-blue-800">Summary for {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}</h2>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{(currentUser?.role === 'doctor' ? myAppointments : todaysAppointments).length}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-700">{scheduledTodayCount}</div>
            <div className="text-xs text-green-600">Scheduled</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-yellow-700">{statusCountsMonthAll.checked_in || 0}</div>
            <div className="text-xs text-yellow-600">Checked-in</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-700">{statusCountsMonthAll.completed || 0}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-700">{statusCountsMonthAll.cancelled || 0}</div>
            <div className="text-xs text-red-600">Cancelled</div>
          </div>
        </div>
        {currentUser?.role === 'doctor' && patientStats && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <div className="bg-blue-100 rounded-lg p-2 text-center text-blue-800 font-semibold">Patients seen today: {patientStats.seenToday}</div>
            <div className="bg-blue-100 rounded-lg p-2 text-center text-blue-800 font-semibold">This week: {patientStats.seenThisWeek}</div>
            <div className="bg-blue-100 rounded-lg p-2 text-center text-blue-800 font-semibold">This month: {patientStats.seenThisMonth}</div>
          </div>
        )}
      </div>
      {/* Main Content */}
      <div className="p-6 overflow-y-auto flex-1">
        {/* Upcoming Appointments for Doctor */}
        {currentUser?.role === 'doctor' && (
          <>
            <h2 className="text-lg font-bold mb-2 text-blue-800">Tomorrow's Appointments</h2>
            {tomorrowsAppointments.length === 0 && <div className="text-gray-400 text-sm mb-4">No appointments for tomorrow</div>}
            <div className="space-y-2 mb-6">
              {tomorrowsAppointments.map(appt => (
                <div key={appt.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-blue-800">{appt.date} {appt.time?.slice(0,5)}</span>
                  <span className="text-gray-700">{getPatientName(appt.patient_id)}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(appt.status)}`}>{appt.status}</span>
                </div>
              ))}
            </div>
            {/* Patients due for vaccination (next 7 days) */}
            <h2 className="text-lg font-bold mb-2 text-blue-800">Patients Due for Vaccination (Next 7 Days)</h2>
            {loadingVaccinations ? (
              <div className="text-gray-400 text-sm mb-4">Loading...</div>
            ) : dueVaccinations.length === 0 ? (
              <div className="text-gray-400 text-sm mb-4">No patients due for vaccination</div>
            ) : (
              <div className="space-y-2 mb-6">
                {dueVaccinations.map(rec => (
                  <div key={rec.id} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                    <Syringe className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-green-800">{getPatientName(rec.patient_id)}</span>
                    <span className="text-xs text-green-700">{rec.vaccine}</span>
                    <span className="text-xs text-green-700">Due: {rec.due_date}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Patients due for follow-up */}
            <h2 className="text-lg font-bold mb-2 text-blue-800">Patients Due for Follow-up (Next 7 Days)</h2>
            {followUpAppointments.length === 0 && <div className="text-gray-400 text-sm mb-4">No patients due for follow-up</div>}
            <div className="space-y-2 mb-6">
              {followUpAppointments.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                  <User className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold text-yellow-800">{getPatientName(a.patient_id)}</span>
                  <span className="text-xs text-yellow-700">Follow-up: {a.date}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Appointments Tab for all roles */}
        {((!currentUser || currentUser.role !== 'doctor') || activeTab === 'appointments') && (
          <>
            <div className="flex items-center justify-between mb-2 mt-4">
              <button
                className="flex items-center gap-2 text-lg font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded transition hover:bg-blue-100/40 px-2 py-1"
                onClick={() => setExpandedAppointmentsSection(v => !v)}
                aria-expanded={expandedAppointmentsSection}
              >
                Appointments ({todaysAppointments.length})
                <span>{expandedAppointmentsSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-500 ${expandedAppointmentsSection ? 'max-h-[2000px] py-2' : 'max-h-0 py-0'}`} style={{ transitionProperty: 'max-height, padding' }}>
              {expandedAppointmentsSection && (
                <>
                  {todaysAppointments.length === 0 && (
                    <div className="text-gray-400 text-sm">No appointments for this date</div>
                  )}
                  <div className="space-y-3">
                    {todaysAppointments
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map(appt => (
                        <div key={appt.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl shadow-sm">
                          <span className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold text-base">
                            {getInitials(getPatientName(appt.patient_id))}
                          </span>
                          <span className="font-semibold text-blue-800">{appt.time?.slice(0,5)}</span>
                          <span className="text-gray-700">{getPatientName(appt.patient_id)}</span>
                          <span className="text-blue-600">/</span>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4 text-blue-400" />
                            {getDoctorName(appt.user_id)}
                          </span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(appt.status)}`}>{appt.status}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
        {/* After the stats cards, for support/admin roles, add: */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'support') && (
          <div className="px-4 md:px-6 mb-4">
            {/* Doctors' Appointments Section (collapsible) */}
            <div className="flex items-center justify-between mb-2 mt-6">
              <button
                className="flex items-center gap-2 text-xl font-extrabold text-blue-900 tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-300 rounded transition hover:bg-blue-100/40 px-2 py-1"
                onClick={() => setExpandedDoctorsSection(v => !v)}
                aria-expanded={expandedDoctorsSection}
              >
                Doctors' Appointments
                <span>{expandedDoctorsSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
              </button>
              <div className="flex gap-2">
                <button onClick={handleExpandAll} disabled={allExpanded} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shadow hover:bg-blue-200 transition disabled:opacity-50">Expand All</button>
                <button onClick={handleCollapseAll} disabled={noneExpanded} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold shadow hover:bg-gray-200 transition disabled:opacity-50">Collapse All</button>
              </div>
            </div>
            <div className={`overflow-hidden transition-all duration-500 ${expandedDoctorsSection ? 'max-h-[2000px] py-2' : 'max-h-0 py-0'}`} style={{ transitionProperty: 'max-height, padding' }}>
              {expandedDoctorsSection && (
                <>
                  <input
                    type="text"
                    placeholder="Search doctor..."
                    value={doctorSearch}
                    onChange={e => setDoctorSearch(e.target.value)}
                    className="w-full mb-4 px-4 py-2 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-800 text-base"
                  />
                  <div className="space-y-4">
                    {filteredDoctors.length === 0 && (
                      <div className="text-gray-400 text-center py-8">No doctors found.</div>
                    )}
                    {filteredDoctors.map(doctor => {
                      const doctorAppointments = appointments.filter(appt => {
                        let apptDate = typeof appt.date === 'string' ? appt.date.split('T')[0] : appt.date?.toLocaleDateString('en-CA');
                        return appt.user_id === doctor.id && apptDate === dateString;
                      });
                      const expanded = expandedDoctors[doctor.id] || false;
                      return (
                        <div key={doctor.id} className={`rounded-2xl shadow-lg border border-blue-100 bg-gradient-to-br from-white to-blue-50 transition-all duration-300 ${expanded ? 'ring-2 ring-blue-300' : ''}`}
                          style={{ boxShadow: expanded ? '0 8px 32px 0 rgba(34,197,94,0.12)' : undefined }}>
                          <button
                            className="w-full flex items-center justify-between px-6 py-4 text-left font-bold text-blue-900 text-lg rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 hover:bg-blue-100/40"
                            onClick={() => setExpandedDoctors(prev => ({ ...prev, [doctor.id]: !expanded }))}
                            aria-expanded={expanded}
                          >
                            <span className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg shadow-inner">{getInitials(doctor.full_name)}</span>
                              <span>{doctor.full_name}</span>
                              <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-xs font-semibold">{doctorAppointments.length} appt</span>
                            </span>
                            <span className="ml-2">{expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
                          </button>
                          <div
                            className={`overflow-hidden transition-all duration-500 ${expanded ? 'max-h-[600px] py-2' : 'max-h-0 py-0'}`}
                            style={{ transitionProperty: 'max-height, padding' }}
                          >
                            {expanded && (
                              <div className="px-4 pb-4">
                                {doctorAppointments.length === 0 ? (
                                  <div className="text-gray-400 text-sm py-4 text-center">No appointments for this doctor</div>
                                ) : (
                                  <ul className="divide-y divide-blue-50">
                                    {doctorAppointments.map(appt => (
                                      <li key={appt.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 group transition-all duration-200 hover:bg-blue-50 rounded-xl">
                                        <span className="inline-flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-blue-400" />
                                          <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-xs shadow-sm">{appt.time}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-2">
                                          <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-base shadow-inner">{getInitials(getPatientName(appt.patient_id))}</span>
                                          <span className="font-medium text-gray-800">{getPatientName(appt.patient_id)}</span>
                                        </span>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${statusClass(appt.status)}`}>{appt.status}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {/* Reminders Section */}
            <div className="mt-8 space-y-4">
              {/* Vaccination Reminders */}
              <div className="rounded-2xl shadow-lg border border-green-100 bg-gradient-to-br from-green-50 to-white">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left font-bold text-green-900 text-lg rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-300 transition-all duration-200 hover:bg-green-100/40"
                  onClick={() => setExpandedDoctors(prev => ({ ...prev, _vacc: !prev._vacc }))}
                  aria-expanded={!!expandedDoctors._vacc}
                >
                  <span className="flex items-center gap-3">
                    <Syringe className="w-6 h-6 text-green-400" />
                    <span>Patients Due for Vaccination (Next 7 Days)</span>
                  </span>
                  <span className="ml-2">{expandedDoctors._vacc ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${expandedDoctors._vacc ? 'max-h-[400px] py-2' : 'max-h-0 py-0'}`} style={{ transitionProperty: 'max-height, padding' }}>
                  {expandedDoctors._vacc && (
                    <div className="px-4 pb-4">
                      {loadingVaccinations ? (
                        <div className="text-gray-400 text-sm py-4 text-center">Loading...</div>
                      ) : dueVaccinations.length === 0 ? (
                        <div className="text-gray-400 text-sm py-4 text-center">No patients due for vaccination</div>
                      ) : (
                        <ul className="divide-y divide-green-50">
                          {dueVaccinations.map(rec => (
                            <li key={rec.id} className="py-3 flex items-center gap-3 group transition-all duration-200 hover:bg-green-50 rounded-xl">
                              <Syringe className="w-5 h-5 text-green-400" />
                              <span className="font-semibold text-green-800">{getPatientName(rec.patient_id)}</span>
                              <span className="text-xs text-green-700">{rec.vaccine}</span>
                              <span className="text-xs text-green-700">Due: {rec.due_date}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Follow-up Reminders */}
              <div className="rounded-2xl shadow-lg border border-yellow-100 bg-gradient-to-br from-yellow-50 to-white">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left font-bold text-yellow-900 text-lg rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all duration-200 hover:bg-yellow-100/40"
                  onClick={() => setExpandedDoctors(prev => ({ ...prev, _follow: !prev._follow }))}
                  aria-expanded={!!expandedDoctors._follow}
                >
                  <span className="flex items-center gap-3">
                    <User className="w-6 h-6 text-yellow-400" />
                    <span>Patients Due for Follow-up (Next 7 Days)</span>
                  </span>
                  <span className="ml-2">{expandedDoctors._follow ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${expandedDoctors._follow ? 'max-h-[400px] py-2' : 'max-h-0 py-0'}`} style={{ transitionProperty: 'max-height, padding' }}>
                  {expandedDoctors._follow && (
                    <div className="px-4 pb-4">
                      {followUpAppointments.length === 0 ? (
                        <div className="text-gray-400 text-sm py-4 text-center">No patients due for follow-up</div>
                      ) : (
                        <ul className="divide-y divide-yellow-50">
                          {followUpAppointments.map(a => (
                            <li key={a.id} className="py-3 flex items-center gap-3 group transition-all duration-200 hover:bg-yellow-50 rounded-xl">
                              <User className="w-5 h-5 text-yellow-400" />
                              <span className="font-semibold text-yellow-800">{getPatientName(a.patient_id)}</span>
                              <span className="text-xs text-yellow-700">Follow-up: {a.date}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {!(currentUser?.role === 'admin' || currentUser?.role === 'support') && (
          <div className="px-4 md:px-6 mb-4">
            {/* Appointments Section (collapsible) */}
            <div className="flex items-center justify-between mb-2 mt-6">
              <button
                className="flex items-center gap-2 text-xl font-extrabold text-blue-900 tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-300 rounded transition hover:bg-blue-100/40 px-2 py-1"
                onClick={() => setExpandedAppointmentsSection(v => !v)}
                aria-expanded={expandedAppointmentsSection}
              >
                Appointments
                <span>{expandedAppointmentsSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-500 ${expandedAppointmentsSection ? 'max-h-[2000px] py-2' : 'max-h-0 py-0'}`} style={{ transitionProperty: 'max-height, padding' }}>
              {expandedAppointmentsSection && (
                <>
                  {/* Existing appointments list for the doctor/user goes here */}
                  {/* ... existing code for appointments list ... */}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarSidebarPanel; 