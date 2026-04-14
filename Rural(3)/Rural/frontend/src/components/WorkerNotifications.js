import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './WorkerNotifications.css';

const WorkerNotifications = ({ onAcceptBooking }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      console.log('🔍 Fetching worker notifications...');
      const response = await api.get('/workers/notifications');
      console.log('📥 Notifications response:', response.data);
      if (response.data.success) {
        console.log('✅ Setting notifications:', response.data.notifications);
        setNotifications(response.data.notifications || []);
      } else {
        console.log('❌ API returned success=false');
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      console.log('🔗 Full error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (notification) => {
    try {
      console.log('🎯 Accepting booking with data:', {
        bookingId: notification.bookingId,
        employerId: notification.employerId,
        notification: notification
      });

      // Validate required data
      if (!notification.bookingId) {
        console.error('❌ Missing bookingId in notification:', notification);
        alert('❌ Error: Booking ID is missing. Please try refreshing the page.');
        return;
      }

      if (!notification.employerId) {
        console.error('❌ Missing employerId in notification:', notification);
        alert('❌ Error: Employer ID is missing. Please try refreshing the page.');
        return;
      }

      const response = await api.post('/workers/accept-booking', {
        bookingId: notification.bookingId,
        employerId: notification.employerId
      });

      console.log('✅ Accept booking response:', response.data);

      if (response.data.success) {
        // Remove this notification and add success message
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        
        // Store pending chat info for auto-opening chat
        sessionStorage.setItem('pendingChat', JSON.stringify({
          conversationId: response.data.conversationId,
          receiver: response.data.employer
        }));

        alert('✅ Booking accepted! Chat enabled for communication.');
        onAcceptBooking && onAcceptBooking(notification);
      } else {
        console.error('❌ API returned success=false:', response.data);
        alert('❌ Failed to accept booking: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error accepting booking:', error);
      console.log('🔗 Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert('❌ Error accepting booking: ' + errorMessage);
    }
  };

  const handleRejectBooking = async (notification) => {
    try {
      const response = await api.post('/workers/reject-booking', {
        bookingId: notification.bookingId,
        employerId: notification.employerId
      });

      if (response.data.success) {
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        alert('❌ Booking rejected');
      }
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('❌ Error rejecting booking: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAcceptJobOffer = async (notification) => {
    try {
      console.log('🎯 Accepting job offer with data:', {
        conversationId: notification.conversationId,
        notification: notification
      });

      // Validate required data
      if (!notification.conversationId) {
        console.error('❌ Missing conversationId in notification:', notification);
        alert('❌ Error: Conversation ID is missing. Please try refreshing the page.');
        return;
      }

      const response = await api.put(`/chat/conversation/${notification.conversationId}/job-offer/response`, {
        action: 'accept'
      });

      console.log('✅ Accept job offer response:', response.data);

      if (response.data.success) {
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        
        sessionStorage.setItem('pendingChat', JSON.stringify({
          conversationId: notification.conversationId,
          receiver: notification.sender
        }));

        alert('✅ Job offer accepted! Chat enabled for communication.');
        onAcceptBooking && onAcceptBooking(notification);
      } else {
        console.error('❌ API returned success=false:', response.data);
        alert('❌ Failed to accept job offer: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error accepting job offer:', error);
      console.log('🔗 Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert('❌ Error accepting job offer: ' + errorMessage);
    }
  };

  const handleRejectJobOffer = async (notification) => {
    try {
      const response = await api.put(`/chat/conversation/${notification.conversationId}/job-offer/response`, {
        action: 'reject'
      });

      if (response.data.success) {
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        alert('❌ Job offer rejected');
      }
    } catch (error) {
      console.error('Error rejecting job offer:', error);
      alert('❌ Error rejecting job offer: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="worker-notifications loading">
        <div className="notification-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="worker-notifications empty">
        <span className="empty-icon">📬</span>
        <h3>No new notifications</h3>
        <p>You'll see booking requests here when employers want to hire you.</p>
      </div>
    );
  }

  return (
    <div className="worker-notifications">
      <h3>📬 Booking Requests</h3>
      <div className="notifications-list">
        {notifications.map((notification) => (
          <div key={notification._id} className="notification-card booking-request">
            <div className="notification-header">
              <div className="employer-info">
                <div className="employer-avatar">
                  {notification.employerName?.charAt(0) || 'E'}
                </div>
                <div>
                  <h4>{notification.employerName}</h4>
                  <p className="booking-category">
                    🏷️ {notification.category} {notification.isEmergency && '🚨 Emergency'}
                  </p>
                </div>
              </div>
              <span className="notification-time">
                {new Date(notification.createdAt).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="notification-body">
              <p className="booking-message">
                {notification.message || 'Would like to book you for a job.'}
              </p>
              {notification.proposedRate && (
                <p className="booking-rate">
                  💰 Proposed Rate: ₹{notification.proposedRate}
                </p>
              )}
            </div>

            <div className="notification-actions">
              <button 
                className="accept-btn"
                onClick={() => notification.type === 'job_offer' 
                  ? handleAcceptJobOffer(notification) 
                  : handleAcceptBooking(notification)}
              >
                ✅ Accept & Start Chat
              </button>
              <button 
                className="reject-btn"
                onClick={() => notification.type === 'job_offer'
                  ? handleRejectJobOffer(notification)
                  : handleRejectBooking(notification)}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkerNotifications;
