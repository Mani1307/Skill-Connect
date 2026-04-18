import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './NearbyWorkers.css';

const NearbyWorkers = ({ jobId }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    fetchNearbyWorkers();
  }, [jobId]);

  const fetchNearbyWorkers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/location/nearby-workers/${jobId}`);
      setWorkers(response.data.data.workers || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch nearby workers');
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Finding nearby workers...</div>;
  }

  return (
    <div className="nearby-workers-container">
      <div className="nearby-header">
        <h2>Workers Near You</h2>
        <p className="worker-count">
          {workers.length} worker{workers.length !== 1 ? 's' : ''} found within 15 km
        </p>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {workers.length === 0 ? (
        <div className="no-workers">
          <p>No workers found in your area with the required skills.</p>
          <p>Try expanding the search radius or adjusting the job requirements.</p>
        </div>
      ) : (
        <div className="workers-list">
          {workers.map(worker => (
            <div 
              key={worker._id} 
              className={`worker-item ${selectedWorker?._id === worker._id ? 'selected' : ''}`}
              onClick={() => setSelectedWorker(worker)}
            >
              <div className="worker-avatar">
                {worker.profileImage ? (
                  <img src={worker.profileImage} alt={worker.name} />
                ) : (
                  <div className="avatar-placeholder">{worker.name.charAt(0)}</div>
                )}
              </div>

              <div className="worker-info">
                <h3>{worker.name}</h3>
                <div className="worker-rating">
                  ⭐ {worker.rating?.average || 0} ({worker.rating?.count || 0} reviews)
                </div>
                
                <div className="worker-skills">
                  {worker.skills?.slice(0, 3).map(skill => (
                    <span key={skill} className="skill-badge">{skill}</span>
                  ))}
                </div>

                <div className="worker-meta">
                  <span className="experience">💼 {worker.experience?.years || 0} yrs exp</span>
                  <span className="distance">📍 {worker.distance} km away</span>
                </div>
              </div>

              <div className="worker-action">
                <button className="hire-btn">Hire</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWorker && (
        <div className="worker-details-panel">
          <div className="details-header">
            <h3>{selectedWorker.name}</h3>
            <button 
              className="close-btn"
              onClick={() => setSelectedWorker(null)}
            >×</button>
          </div>

          <div className="details-body">
            <div className="detail-group">
              <label>Contact:</label>
              <p>{selectedWorker.email}</p>
              <p>{selectedWorker.phone}</p>
            </div>

            <div className="detail-group">
              <label>Skills:</label>
              <div className="skills-list">
                {selectedWorker.skills?.map(skill => (
                  <span key={skill} className="skill-badge">{skill}</span>
                ))}
              </div>
            </div>

            <div className="detail-group">
              <label>Location:</label>
              <p>{selectedWorker.location?.city}, {selectedWorker.location?.district}</p>
              <p className="distance-info">
                📍 {selectedWorker.distance} km from job location
              </p>
            </div>

            <button className="hire-btn-large">Hire This Worker</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyWorkers;
