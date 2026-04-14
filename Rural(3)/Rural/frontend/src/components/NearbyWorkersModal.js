import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './NearbyWorkersModal.css';

const NearbyWorkersModal = ({ isOpen, onClose, category, isEmergency = false }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    if (isOpen && category) {
      fetchNearbyWorkers();
    }
  }, [isOpen, category]);

  const fetchNearbyWorkers = async () => {
    setLoading(true);
    try {
      // Get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          const response = await api.get('/workers/search', {
            params: {
              skills: category,
              latitude,
              longitude,
              radius: 25, // 25km radius
              limit: 20
            }
          });
          
          setWorkers(response.data.workers || []);
          setLoading(false);
        }, () => {
          // Fallback if location is denied
          fetchWithoutLocation();
        });
      } else {
        fetchWithoutLocation();
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      setLoading(false);
    }
  };

  const fetchWithoutLocation = async () => {
    try {
      const response = await api.get('/workers/search', {
        params: {
          skills: category,
          limit: 20
        }
      });
      setWorkers(response.data.workers || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workers:', error);
      setLoading(false);
    }
  };

  const handleContactWorker = (worker) => {
    setSelectedWorker(worker);
  };

  const handleBookWorker = async (worker) => {
    try {
      const response = await api.post('/jobs/book-worker', {
        workerId: worker._id,
        category: category,
        isEmergency: isEmergency
      });

      if (response.data.success) {
        alert(`📨 Booking request sent to ${worker.name}! They will be notified and can accept or reject the request.`);
        onClose();
      } else {
        alert('❌ Failed to send booking request. Please try again.');
      }
    } catch (error) {
      console.error('Error booking worker:', error);
      alert('❌ Error sending booking request: ' + (error.response?.data?.message || error.message));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>
              {isEmergency && <span className="emergency-badge">🚨 EMERGENCY</span>}
              {isEmergency ? 'Available Workers Now' : 'Nearby Workers'}
            </h2>
            <p className="modal-subtitle">
              {isEmergency 
                ? 'These workers are immediately available for urgent work' 
                : `Showing skilled ${category} workers near you`}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Finding nearby workers...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="no-workers">
            <span className="no-workers-icon">😔</span>
            <h3>No Workers Found</h3>
            <p>Try expanding your search radius or selecting a different category.</p>
          </div>
        ) : (
          <div className="workers-grid">
            {workers.map((worker) => (
              <div key={worker._id} className={`worker-card ${isEmergency ? 'emergency-card' : ''}`}>
                <div className="worker-header">
                  <div className="worker-avatar">
                    {worker.profileImage ? (
                      <img src={`http://localhost:5000${worker.profileImage}`} alt={worker.name} />
                    ) : (
                      <span>{worker.name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="worker-info">
                    <h3>{worker.name}</h3>
                    <div className="worker-rating">
                      <span className="rating-stars">⭐ {worker.rating?.average?.toFixed(1) || '0.0'}</span>
                      <span className="rating-count">({worker.rating?.count || 0} reviews)</span>
                    </div>
                  </div>
                  {worker.distance && (
                    <div className="distance-badge">
                      📍 {worker.distance} km
                    </div>
                  )}
                </div>

                <div className="worker-details">
                  <div className="detail-row">
                    <span className="detail-label">💼 Experience:</span>
                    <span className="detail-value">{worker.experience?.years || 0} years</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🏆 Level:</span>
                    <span className={`level-badge ${worker.expertLevel}`}>
                      {worker.expertLevel || 'beginner'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">✅ Jobs:</span>
                    <span className="detail-value">{worker.completedJobs || 0} completed</span>
                  </div>
                </div>

                <div className="worker-skills">
                  {worker.skills?.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))}
                  {worker.skills?.length > 3 && (
                    <span className="skill-tag more">+{worker.skills.length - 3}</span>
                  )}
                </div>

                <div className="worker-actions">
                  <button 
                    className="btn-contact"
                    onClick={() => handleContactWorker(worker)}
                  >
                    📞 Contact
                  </button>
                  <button 
                    className={`btn-hire ${isEmergency ? 'emergency-hire' : ''}`}
                    onClick={() => handleBookWorker(worker)}
                  >
                    {isEmergency ? '⚡ Book Now' : '📅 Book Worker'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedWorker && (
          <div className="contact-popup">
            <div className="contact-popup-content">
              <h3>Contact {selectedWorker.name}</h3>
              <p><strong>📞 Phone:</strong> {selectedWorker.phone}</p>
              <p><strong>📧 Email:</strong> {selectedWorker.email}</p>
              <button onClick={() => setSelectedWorker(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyWorkersModal;
