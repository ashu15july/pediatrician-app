import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Calendar, 
  User, 
  Plus,
  Search,
  Filter,
  Folder,
  Image,
  File,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePatientAuth } from '../contexts/PatientAuthContext';

const DocumentManagement = ({ patientId, patientName }) => {
  const { currentPatient, isLoggedIn } = usePatientAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'lab_report',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const documentCategories = [
    { value: 'lab_report', label: 'Lab Reports', icon: FileText, color: 'blue' },
    { value: 'prescription', label: 'Prescriptions', icon: FileText, color: 'green' },
    { value: 'vaccination_card', label: 'Vaccination Cards', icon: FileText, color: 'purple' },
    { value: 'growth_chart', label: 'Growth Charts', icon: TrendingUp, color: 'orange' },
    { value: 'medical_certificate', label: 'Medical Certificates', icon: FileText, color: 'red' },
    { value: 'other', label: 'Other Documents', icon: File, color: 'gray' }
  ];

  useEffect(() => {
    if (patientId) {
      loadDocuments();
    }
  }, [patientId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title if empty
      if (!uploadForm.title) {
        setUploadForm(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, "") // Remove file extension
        }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) {
      alert('Please select a file and provide a title');
      return;
    }

    if (!isLoggedIn || !currentPatient) {
      alert('Please log in to upload documents');
      return;
    }

    try {
      setUploading(true);

      // Method 1: Try direct upload first
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${patientId}/${Date.now()}.${fileExt}`;
      
      let uploadData, uploadError;
      
      // Try multiple approaches
      const uploadAttempts = [
        // Attempt 1: Simple upload to patient-documents
        async () => {
          return await supabase.storage
            .from('patient-documents')
            .upload(fileName, selectedFile);
        },
        // Attempt 2: Upload to patient-files
        async () => {
          return await supabase.storage
            .from('patient-files')
            .upload(fileName, selectedFile);
        },
        // Attempt 3: Upload with explicit options
        async () => {
          return await supabase.storage
            .from('patient-documents')
            .upload(fileName, selectedFile, {
              cacheControl: '3600',
              upsert: false,
              contentType: selectedFile.type
            });
        },
        // Attempt 4: Upload with different path structure
        async () => {
          const simpleFileName = `${Date.now()}.${fileExt}`;
          return await supabase.storage
            .from('patient-documents')
            .upload(simpleFileName, selectedFile);
        }
      ];

      // Try each upload attempt
      for (let i = 0; i < uploadAttempts.length; i++) {
        try {
          const result = await uploadAttempts[i]();
          uploadData = result.data;
          uploadError = result.error;
          
          if (!uploadError) {
            break;
          }
        } catch (error) {
          // Upload attempt failed
        }
      }

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL - try both buckets
      let publicUrl;
      try {
        const { data: { publicUrl: url1 } } = supabase.storage
          .from('patient-documents')
          .getPublicUrl(fileName);
        publicUrl = url1;
      } catch (error) {
        try {
          const { data: { publicUrl: url2 } } = supabase.storage
            .from('patient-files')
            .getPublicUrl(fileName);
          publicUrl = url2;
        } catch (error2) {
          // If both fail, try with simple filename
          const simpleFileName = `${Date.now()}.${fileExt}`;
          const { data: { publicUrl: url3 } } = supabase.storage
            .from('patient-documents')
            .getPublicUrl(simpleFileName);
          publicUrl = url3;
        }
      }

      // Public URL generated

      // Save document record to database
      const { error: dbError } = await supabase
        .from('patient_documents')
        .insert([{
          patient_id: patientId,
          title: uploadForm.title,
          category: uploadForm.category,
          description: uploadForm.description,
          file_url: publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          document_date: uploadForm.date,
          created_at: new Date().toISOString()
        }]);

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      // Document record saved successfully

      // Reset form and reload documents
      setUploadForm({
        title: '',
        category: 'lab_report',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setSelectedFile(null);
      setShowUploadModal(false);
      loadDocuments();

    } catch (error) {
      console.error('Error uploading document:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      
      let errorMessage = 'Failed to upload document. Please try again.';
      if (error.message?.includes('Unauthorized')) {
        errorMessage = 'Permission denied. Please check your access rights.';
      } else if (error.message?.includes('Bucket not found')) {
        errorMessage = 'Storage bucket not configured. Please contact support.';
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const getCategoryIcon = (category) => {
    const cat = documentCategories.find(c => c.value === category);
    return cat ? cat.icon : File;
  };

  const getCategoryColor = (category) => {
    const cat = documentCategories.find(c => c.value === category);
    return cat ? cat.color : 'gray';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Folder className="w-8 h-8" />
              Document Management
            </h2>
            <p className="text-purple-100 mt-1">Upload and manage your medical documents</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              {documentCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-lg border border-gray-100">
          <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Upload your first medical document to get started'
            }
          </p>
          {!searchTerm && filterCategory === 'all' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors mx-auto"
            >
              <Upload className="w-5 h-5" />
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const CategoryIcon = getCategoryIcon(doc.category);
            const categoryColor = getCategoryColor(doc.category);
            
            return (
              <div key={doc.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`bg-${categoryColor}-100 p-2 rounded-lg`}>
                        <CategoryIcon className={`w-6 h-6 text-${categoryColor}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 line-clamp-2">{doc.title}</h3>
                        <p className="text-sm text-gray-500">
                          {documentCategories.find(c => c.value === doc.category)?.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {doc.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(doc.document_date || doc.created_at)}</span>
                    </div>
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter document title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {documentCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Date</label>
                <input
                  type="date"
                  value={uploadForm.date}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows="3"
                  placeholder="Optional description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Click to select a file'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPG, PNG, DOC up to 10MB
                    </p>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !uploadForm.title}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement; 