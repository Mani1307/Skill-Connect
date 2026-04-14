import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './BrowseWorkers.css';

const BrowseWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [city, setCity] = useState('');
  const navigate = useNavigate();
  
  const handleStartChat = async (worker) => {
    try {
      // Create or get existing conversation
      const response = await api.post('/chat/conversation', {
        participantId: worker._id
      });
      
      if (response.data.success) {
        // Store conversation data in state for the modal
        sessionStorage.setItem('pendingChat', JSON.stringify({
          conversationId: response.data.conversation._id,
          receiver: worker
        }));
        
        // Open chat modal
        window.dispatchEvent(new CustomEvent('openChatModal'));
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Error starting chat: ' + (error.response?.data?.message || error.message));
    }
  };
  
  const handleInviteWorker = async (worker) => {
    if (!window.confirm(`Invite ${worker.name} to work for you?`)) return;
    
    try {
      // Create a direct message to the worker
      const response = await api.post('/chat/conversation', {
        participantId: worker._id
      });
      
      if (response.data.success) {
        // Send an invitation message
        await api.post('/chat/message', {
          conversationId: response.data.conversation._id,
          receiverId: worker._id,
          message: `Hello ${worker.name}, I'm interested in hiring you for a job. Would you be available?`,
          messageType: 'text'
        });
        
        alert(`${worker.name} has been invited. Start a chat to discuss the job details.`);
        
        // Store conversation data in state for the modal
        sessionStorage.setItem('pendingChat', JSON.stringify({
          conversationId: response.data.conversation._id,
          receiver: worker
        }));
        
        // Open chat modal
        window.dispatchEvent(new CustomEvent('openChatModal'));
      }
    } catch (error) {
      console.error('Error inviting worker:', error);
      alert('Error inviting worker: ' + (error.response?.data?.message || error.message));
    }
  };
  
  const handleMakeJobOffer = async (worker) => {
    try {
      // Create a conversation if it doesn't exist
      const response = await api.post('/chat/conversation', {
        participantId: worker._id
      });
      
      if (response.data.success) {
        // Prompt for job details
        const jobTitle = prompt('Enter job title:', 'Job Opportunity');
        if (!jobTitle) return;
        
        const jobDescription = prompt('Enter job details:', `I have a job opportunity for you: ${jobTitle}`);
        if (!jobDescription) return;
        
        // Make a formal job offer through the conversation
        const offerResponse = await api.post(`/chat/conversation/${response.data.conversation._id}/job-offer`, {
          message: jobDescription,
          jobId: null // We don't have a specific job ID here, but this is where it would go
        });
        
        if (offerResponse.data.success) {
          alert(`You offered a job to the worker ${worker.name}. They can accept or reject it in the notifications page. Chat will be enabled once they accept.`);
        }
      }
    } catch (error) {
      console.error('Error making job offer:', error);
      alert('Error making job offer: ' + (error.response?.data?.message || error.message) + '\n\n' + (error.response?.data?.error || ''));
    }
  };

  const categories = [
    { id: 'all', label: 'All Workers', skill: '' },
    { id: 'painter', label: 'Painters', icon: '🎨', skill: 'painter' },
    { id: 'electrician', label: 'Electricians', icon: '⚡', skill: 'electrician' },
    { id: 'mason', label: 'Masons', icon: '🧱', skill: 'mason' },
    { id: 'plumber', label: 'Plumbers', icon: '🚰', skill: 'plumber' },
    { id: 'carpenter', label: 'Carpenters', icon: '🪚', skill: 'carpenter' },
    { id: 'welder', label: 'Welders', icon: '🔥', skill: 'welder' },
    { id: 'cleaner', label: 'Cleaners', icon: '🧹', skill: 'cleaner' },
    { id: 'gardener', label: 'Gardeners', icon: '🌱', skill: 'gardener' },
    { id: 'loader', label: 'Loaders', icon: '📦', skill: 'loader' },
    { id: 'tiler', label: 'Tilers', icon: '📐', skill: 'tiler' }
  ];

  useEffect(() => {
    fetchWorkers();
  }, [filter, city]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const skillParam = filter !== 'all' ? categories.find(c => c.id === filter)?.skill : '';
      const query = [];
      
      if (skillParam) query.push(`skills=${skillParam}`);
      
      // If city is provided, try to geocode it first for distance-based search
      if (city && city.length > 2) {
        try {
          const geoResponse = await api.post('/location/geocode', { address: city });
          if (geoResponse.data.success) {
            const { latitude, longitude } = geoResponse.data.data;
            query.push(`latitude=${latitude}`);
            query.push(`longitude=${longitude}`);
            query.push(`radius=50`); // Search within 50km by default when city is specified
          } else {
            query.push(`city=${city}`);
          }
        } catch (err) {
          console.warn('Geocoding failed, falling back to text search');
          query.push(`city=${city}`);
        }
      }

      const response = await api.get(`/workers/search?${query.join('&')}`);
      setWorkers(response.data.workers);
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading workers...</div>;

  return (
    <div className="browse-container">
      <header className="browse-header">
        <h1>Find Skilled Workers</h1>
        <p>Browse experienced workers by service type and location</p>
      </header>

      <div className="filter-controls">
        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`cat-filter-btn ${filter === cat.id ? 'active' : ''}`}
              onClick={() => setFilter(cat.id)}
            >
              {cat.icon && <span>{cat.icon}</span>} {cat.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter by city..."
          className="city-search"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      <div className="workers-grid">
        {workers.length > 0 ? (
          workers.map(worker => (
            <div key={worker._id} className="worker-profile-card">
              <div className="worker-photo">
                {worker.profileImage ? (
                  <img src={worker.profileImage} alt={worker.name} />
                ) : (
                  <div className="default-avatar">{worker.name.charAt(0)}</div>
                )}
              </div>
              <div className="worker-info-section">
                <h3>{worker.name}</h3>
                <div className="rating-bar">
                  <span className="stars">⭐ {worker.rating?.average || 0}</span>
                  <span className="reviews">({worker.rating?.count || 0} reviews)</span>
                </div>
                <div className="worker-skills">
                  {worker.skills?.map(skill => (
                    <span key={skill} className="skill-badge">{skill}</span>
                  ))}
                </div>
                <div className="worker-meta">
                  <p>📍 {worker.location?.city}, {worker.location?.district}</p>
                  {worker.distance && worker.distance !== Infinity && (
                    <p className="distance-tag">📏 {worker.distance} km away</p>
                  )}
                  <p>💼 {worker.completedJobs || 0} jobs completed</p>
                  <p>⏱️ {worker.experience?.years || 0} years experience</p>
                  <p className="expert-tag">{worker.expertLevel}</p>
                </div>
                <div className="contact-options">
                  <button
                    className="contact-worker-btn hire-btn"
                    onClick={() => navigate('/post-job')}
                  >
                    Post Job
                  </button>
                  <button
                    className="contact-worker-btn offer-btn"
                    onClick={() => {
                      // Make a formal job offer
                      handleMakeJobOffer(worker);
                    }}
                  >
                    💼 Offer Job
                  </button>
                  <button
                    className="contact-worker-btn invite-btn"
                    onClick={() => {
                      // Invite worker directly
                      handleInviteWorker(worker);
                    }}
                  >
                    📨 Invite
                  </button>
                  <button
                    className="contact-worker-btn chat-btn"
                    onClick={() => {
                      // Create conversation and open chat
                      handleStartChat(worker);
                    }}
                  >
                    💬 Chat
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="no-results">No workers found. Try adjusting your filters.</p>
        )}
      </div>
    </div>
  );
};

export default BrowseWorkers;
