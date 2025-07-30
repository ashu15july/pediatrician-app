import React from 'react';

const PatientIdPopup = ({ patientId, patientName, onClose }) => {
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(patientId).then(() => {
      // You can add a toast notification here if needed
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handlePrint = () => {
    const printContent = `
      Patient Registration Successful
      
      Patient Name: ${patientName}
      Patient ID: ${patientId}
      
      Please keep this ID safe for future reference.
      You will need this ID to access your medical records.
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Patient ID - ${patientName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin: 20px 0; }
            .patient-id { font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0; }
            .note { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            @media print { body { font-size: 14px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Patient Registration Successful</h1>
          </div>
          <div class="info">
            <strong>Patient Name:</strong> ${patientName}<br>
            <strong>Patient ID:</strong> <span class="patient-id">${patientId}</span>
          </div>
          <div class="note">
            <strong>Important:</strong> Please keep this Patient ID safe for future reference. 
            You will need this ID to access your medical records and book appointments.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600">Your patient account has been created successfully.</p>
        </div>

        {/* Patient information */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Patient Name</p>
            <p className="font-semibold text-gray-900 mb-4">{patientName}</p>
            
            <p className="text-sm text-gray-600 mb-2">Your Patient ID</p>
            <div className="bg-white rounded-lg p-3 border-2 border-blue-200 mb-3">
              <p className="text-2xl font-bold text-blue-600 tracking-wider">{patientId}</p>
            </div>
            
            <button
              onClick={handleCopyToClipboard}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>

        {/* Important note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800 mb-1">Important</p>
              <p className="text-sm text-yellow-700">
                Please save this Patient ID safely. You will need it to access your medical records and book future appointments.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={handlePrint}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Patient ID
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientIdPopup; 