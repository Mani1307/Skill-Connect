import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import socket from '../utils/socket';
import './ChatInterface.css';

const ChatInterface = ({ conversationId, receiver, onClose, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isComplainModalOpen, setIsComplainModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    finalTime: '',
    finalLocation: '',
    finalAgreedPrice: ''
  });
  const [cancelReason, setCancelReason] = useState('');
  const [complaintDetails, setComplaintDetails] = useState({ type: 'other', description: '' });
  const [ratingDetails, setRatingDetails] = useState({ rating: 5, review: '' });
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isEmployer = currentUser.role === 'employer';
  const isWorker = currentUser.role === 'worker';
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      loadConversation();
      setupSocketListeners();
    }

    return () => {
      socket.off('newMessage');
    };
  }, [conversationId]); // Run when conversationId changes

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupSocketListeners = () => {
    socket.on('newMessage', (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => [...prev, data.message]);
      }
    });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chat/conversation/${conversationId}/messages`);
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      alert('Error loading messages: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const loadConversation = async () => {
    try {
      const response = await api.get(`/chat/conversation/${conversationId}`);
      if (response.data.success) {
        setConversation(response.data.conversation);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };
  
  const handleJobOfferResponse = async (action) => {
    try {
      const response = await api.put(`/chat/conversation/${conversationId}/job-offer/response`, {
        action
      });
      
      if (response.data.success) {
        // Reload conversation to update status
        loadConversation();
        // Show success message
        alert(`Job offer ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`);
      }
    } catch (error) {
      console.error('Error responding to job offer:', error);
      alert('Error responding to job offer: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/bookings/${conversation.booking}/confirm`, bookingDetails);
      if (response.data.success) {
        alert('✅ Booking confirmed!');
        setIsConfirmModalOpen(false);
        loadConversation();
      }
    } catch (error) {
      alert('❌ Error confirming booking: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCompleteJob = async () => {
    if (!window.confirm('Mark this job as completed?')) return;
    try {
      const response = await api.put(`/bookings/${conversation.booking}/complete`);
      if (response.data.success) {
        alert('✅ Job marked as completed! Please rate the worker.');
        loadConversation();
        setIsRatingModalOpen(true);
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelBooking = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/bookings/${conversation.booking}/cancel`, { reason: cancelReason });
      if (response.data.success) {
        alert('❌ Booking cancelled');
        setIsCancelModalOpen(false);
        loadConversation();
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRaiseComplaint = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/bookings/${conversation.booking}/complain`, complaintDetails);
      if (response.data.success) {
        alert('⚠️ Dispute raised. Admin will review it soon.');
        setIsComplainModalOpen(false);
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/ratings', {
        jobId: conversation.job?._id, // This might need careful check as Job model might not be available
        ratedUserId: receiver._id,
        rating: ratingDetails.rating,
        review: ratingDetails.review
      });
      if (response.data.success) {
        alert('⭐ Rating submitted! Thank you.');
        setIsRatingModalOpen(false);
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await api.post('/chat/message', {
        conversationId,
        receiverId: receiver._id,
        message: newMessage.trim()
      });

      if (response.data.success) {
        setMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="chat-user-info">
          <div className="user-avatar">
            {(receiver && receiver.name) ? receiver.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <h4>{receiver?.name}</h4>
            <p className="user-role">{receiver?.role}</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="loading-messages">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <>
            {messages.map((message) => {
              if (message.messageType === 'job_offer') {
                // Show job offer message with accept/reject buttons for workers
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const isWorker = currentUser.role === 'worker';
                const isPending = conversation?.jobOffer?.status === 'pending';
                
                return (
                  <div key={message._id} className="message received job-offer-message">
                    <div className="message-content">
                      <p><strong>💼 Job Offer:</strong> {message.message}</p>
                      {isWorker && isPending && (
                        <div className="job-offer-actions">
                          <button 
                            className="offer-action-btn accept"
                            onClick={() => handleJobOfferResponse('accept')}
                          >
                            Accept Job
                          </button>
                          <button 
                            className="offer-action-btn reject"
                            onClick={() => handleJobOfferResponse('reject')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {conversation?.jobOffer?.status && (
                        <div className="offer-status">
                          Status: <span className={`status-${conversation.jobOffer.status}`}>
                            {conversation.jobOffer.status.charAt(0).toUpperCase() + conversation.jobOffer.status.slice(1)}
                          </span>
                        </div>
                      )}
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                        {message.read && <span className="read-status"> ✓</span>}
                      </span>
                    </div>
                  </div>
                );
              } else if (message.messageType === 'job_offer_response') {
                return (
                  <div
                    key={message._id}
                    className={`message ${
                      message.sender && message.sender._id === (JSON.parse(localStorage.getItem('user') || '{}')).id ? 'sent' : 'received'
                    } job-offer-response`}
                  >
                    <div className="message-content">
                      <p>{message.message}</p>
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                        {message.read && <span className="read-status"> ✓</span>}
                      </span>
                    </div>
                  </div>
                );
              } else {
                // Regular message
                return (
                  <div
                    key={message._id}
                    className={`message ${
                      message.sender && message.sender._id === (JSON.parse(localStorage.getItem('user') || '{}')).id ? 'sent' : 'received'
                    }`}
                  >
                    <div className="message-content">
                      <p>{message.message}</p>
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                        {message.read && <span className="read-status"> ✓</span>}
                      </span>
                    </div>
                  </div>
                );
              }
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            conversation?.jobOffer && conversation.jobOffer.status !== 'accepted'
              ? 'Chat is disabled until the job offer is accepted.'
              : 'Type your message...'
          }
          disabled={sending || (conversation?.jobOffer && conversation.jobOffer.status !== 'accepted')}
        />
        <button 
          type="submit" 
          disabled={sending || !newMessage.trim() || (conversation?.jobOffer && conversation.jobOffer.status !== 'accepted')}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;