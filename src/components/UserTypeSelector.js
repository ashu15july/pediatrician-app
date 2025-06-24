import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserTypeSelector() {
  const navigate = useNavigate();

  const handleUserTypeSelect = (userType) => {
    switch (userType) {
      case 'superadmin':
        navigate('/superadmin-login');
        break;
      case 'clinic':
        navigate('/clinic-login');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Pediatrician App
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Select your user type to continue
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => handleUserTypeSelect('superadmin')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            Super Admin
          </button>
          
          <button
            onClick={() => handleUserTypeSelect('clinic')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            Clinic User (Doctor/Admin/Support)
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Test Credentials:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Super Admin:</strong> admin@pediatrician.com / admin123</p>
            <p><strong>Clinic Doctor:</strong> doctor@clinic1.com / doctor123</p>
            <p><strong>Clinic Admin:</strong> admin@clinic1.com / admin123</p>
            <p><strong>Clinic Support:</strong> support@clinic1.com / support123</p>
          </div>
        </div>
      </div>
    </div>
  );
} 