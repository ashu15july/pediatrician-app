import React, { useEffect, useState } from 'react';
import { Calendar, User, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClinicAuth } from '../contexts/ClinicAuthContext';
import { ClinicProvider, useClinic } from '../contexts/ClinicContext';

const MainLayout = ({ children, currentView, setCurrentView, currentUser }) => {
  const { currentUser: authUser, logout: authLogout, hasPermission: authHasPermission } = useAuth();
  const { currentUser: clinicUser, logout: clinicLogout, hasPermission: clinicHasPermission } = useClinicAuth();
  const { clinic, loading, error } = useClinic();
  
  // Determine which user is active and which logout function to use
  const activeUser = clinicUser || authUser;
  const logout = clinicUser ? clinicLogout : authLogout;
  const hasPermission = clinicUser ? clinicHasPermission : authHasPermission;
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading clinic info...</div>;
  }
  if (error || !clinic) {
    return <div className="flex items-center justify-center h-screen text-lg text-red-600">{error || 'Clinic not found.'}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow">
        <div className="flex items-center gap-4">
          {clinic.logo_url && (
            <img src={clinic.logo_url} alt="Clinic Logo" className="h-10 w-10 rounded-full object-cover" />
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-blue-700 dark:text-blue-200">{clinic.name}</h1>
            {activeUser && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span className="font-medium">{activeUser.full_name || activeUser.email}</span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">
                  {activeUser.role}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-6">
            {hasPermission('view_appointments') && (
              <button
                onClick={() => setCurrentView('calendar')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'calendar' 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Calendar</span>
              </button>
            )}
            
            {hasPermission('view_patients') && (
              <button
                onClick={() => setCurrentView('patients')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'patients' 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Patients</span>
              </button>
            )}
          </nav>
          
          <button
            onClick={() => setDarkMode(dm => !dm)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow hover:bg-blue-100 dark:hover:bg-blue-900 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Toggle dark mode"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="hidden md:inline">{darkMode ? 'Light' : 'Dark'} Mode</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="p-0">
        {children}
      </main>
    </div>
  );
};

export default function MainLayoutWithProvider(props) {
  return (
    <ClinicProvider>
      <MainLayout {...props} />
    </ClinicProvider>
  );
} 