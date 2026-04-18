import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './WorkerProfile.css';

const WorkerProfile = ({ profile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    residentialAddress: '',
    currentAddress: '',
    workExperience: '',
    capabilities: '',
    bio: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        residentialAddress: profile.residentialAddress || '',
        currentAddress: profile.currentAddress || '',
        workExperience: profile.workExperience || '',
        capabilities: profile.capabilities || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/workers/profile', formData);
      if (response.data.success) {
        alert('✅ Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || 'Failed to update profile'));
    }
  };

  if (!profile) {
    return (
      <div className="worker-profile loading">
        <div className="profile-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="worker-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-placeholder">
            {profile.name ? profile.name.charAt(0).toUpperCase() : '👤'}
          </div>
        </div>
        <div className="profile-info">
          <h2>{profile.name}</h2>
          <p className="profile-role">👷 Professional Worker</p>
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-label">Experience</span>
              <span className="stat-value">{profile.experience?.years || 0} years</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Rating</span>
              <span className="stat-value">⭐ {profile.rating?.average || 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Jobs Completed</span>
              <span className="stat-value">{profile.completedJobs || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button 
          className="edit-profile-btn"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
        </button>
      </div>

      {isEditing ? (
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>📞 Mobile Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your mobile number"
                required
              />
            </div>

            <div className="form-group">
              <label>🏠 Residential Address</label>
              <textarea
                name="residentialAddress"
                value={formData.residentialAddress}
                onChange={handleInputChange}
                placeholder="Enter your residential address"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>📍 Current Address</label>
              <textarea
                name="currentAddress"
                value={formData.currentAddress}
                onChange={handleInputChange}
                placeholder="Enter your current address"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>💼 Work Experience</label>
              <textarea
                name="workExperience"
                value={formData.workExperience}
                onChange={handleInputChange}
                placeholder="Describe your work experience..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>🛠️ Capabilities</label>
              <textarea
                name="capabilities"
                value={formData.capabilities}
                onChange={handleInputChange}
                placeholder="List your skills and capabilities..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>📝 Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-profile-btn">
              💾 Save Profile
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => setIsEditing(false)}
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-details">
          <div className="detail-section">
            <h3>📞 Contact Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Email:</span>
                <span className="value">{profile.email}</span>
              </div>
              <div className="detail-item">
                <span className="label">Phone:</span>
                <span className="value">{profile.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>📍 Address Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Residential:</span>
                <span className="value">{profile.residentialAddress || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Current:</span>
                <span className="value">{profile.currentAddress || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>💼 Professional Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Experience:</span>
                <span className="value">{profile.workExperience || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Capabilities:</span>
                <span className="value">{profile.capabilities || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>📝 About</h3>
            <div className="bio-content">
              {profile.bio || 'No bio provided'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerProfile;
