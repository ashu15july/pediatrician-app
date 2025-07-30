import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Plus,
  Paperclip,
  Smile,
  MoreVertical,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const PatientCommunication = ({ patientId, patientName, currentClinic }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (patientId) {
      loadDoctors();
      loadMessages();
    }
  }, [patientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, specialization, avatar_url')
        .eq('role', 'doctor')
        .eq('clinic_id', currentClinic?.id)
        .order('full_name');

      if (error) throw error;
      setDoctors(data || []);
      if (data && data.length > 0) {
        setSelectedDoctor(data[0]);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_messages')
        .select(`
          *,
          sender:users!patient_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:users!patient_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${patientId},receiver_id.eq.${patientId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDoctor) return;

    try {
      setSending(true);
      const { data, error } = await supabase
        .from('patient_messages')
        .insert([{
          sender_id: patientId,
          receiver_id: selectedDoctor.id,
          message: newMessage.trim(),
          message_type: 'text',
          created_at: new Date().toISOString()
        }])
        .select(`
          *,
          sender:users!patient_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:users!patient_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const isOwnMessage = (message) => {
    return message.sender_id === patientId;
  };

  const getMessageStatus = (message) => {
    if (isOwnMessage(message)) {
      return message.read_at ? 'read' : 'sent';
    }
    return null;
  };

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
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <MessageCircle className="w-8 h-8" />
              Secure Communication
            </h2>
            <p className="text-green-100 mt-1">Message your pediatrician securely</p>
          </div>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Message
          </button>
        </div>
      </div>

      {/* Doctor Selection */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Message to:</label>
          <select
            value={selectedDoctor?.id || ''}
            onChange={(e) => {
              const doctor = doctors.find(d => d.id === e.target.value);
              setSelectedDoctor(doctor);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.full_name} {doctor.specialization ? `(${doctor.specialization})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No messages yet</h3>
              <p className="text-gray-500 mb-6">Start a conversation with your pediatrician</p>
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                Send First Message
              </button>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = isOwnMessage(message);
              const showDate = index === 0 || 
                formatDate(message.created_at) !== formatDate(messages[index - 1]?.created_at);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center mb-4">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                      {!isOwn && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            Dr. {message.sender?.full_name}
                          </span>
                        </div>
                      )}
                      
                      <div className={`rounded-lg px-4 py-2 ${
                        isOwn 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                      </div>
                      
                      <div className={`flex items-center gap-2 mt-1 ${
                        isOwn ? 'justify-end' : 'justify-start'
                      }`}>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.created_at)}
                        </span>
                        {isOwn && (
                          <div className="flex items-center gap-1">
                            {getMessageStatus(message) === 'sent' && (
                              <CheckCircle className="w-3 h-3 text-gray-400" />
                            )}
                            {getMessageStatus(message) === 'read' && (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={sending || !selectedDoctor}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim() || !selectedDoctor}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">New Message</h3>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor</label>
                <select
                  value={selectedDoctor?.id || ''}
                  onChange={(e) => {
                    const doctor = doctors.find(d => d.id === e.target.value);
                    setSelectedDoctor(doctor);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select a doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows="4"
                  placeholder="Type your message..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  sendMessage();
                  setShowNewMessageModal(false);
                }}
                disabled={sending || !newMessage.trim() || !selectedDoctor}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCommunication; 