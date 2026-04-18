import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import MLWagePrediction from '../components/MLWagePrediction';
import './PostJob.css';

const PostJob = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const [mlPrediction, setMlPrediction] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationDetected, setLocationDetected] = useState(false);

  // Auto-detect user location (especially for Guntur area)
  useEffect(() => {
    const detectUserLocation = () => {
      if (!navigator.geolocation) {
        console.log('Geolocation is not supported by this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          
          // Check if user is near Guntur (approximate coordinates)
          const gunturLat = 16.3061;
          const gunturLng = 80.4368;
          const distance = calculateDistance(latitude, longitude, gunturLat, gunturLng);
          
          if (distance <= 50) { // Within 50km of Guntur
            // Auto-fill Guntur location
            setFormData(prev => ({
              ...prev,
              location: {
                ...prev.location,
                city: 'Guntur',
                state: 'Andhra Pradesh',
                pincode: '522001'
              }
            }));
            setLocationDetected(true);
            console.log('🎯 Auto-detected Guntur location!');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    };

    detectUserLocation();
  }, []);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Handle location changes from ML prediction (location now managed by ML component)
  const handleLocationChange = (location) => {
    console.log(`📍 Location updated via ML: ${location}`);
    // Location is now fully handled by ML component
  };

  // Handle pre-filled category from navigation
  useEffect(() => {
    if (location.state?.selectedCategory) {
      // Job type is now handled by ML prediction, no need to set it here
      console.log(`🎯 Category pre-selected: ${location.state.categoryName}`);
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: { ...formData[parent], [child]: value }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'number' ? parseInt(value) || value : value
      });
    }
  };

  const handleMLPredictionComplete = (prediction) => {
    setMlPrediction(prediction);
    // Auto-fill wage estimation based on ML prediction
    if (prediction && prediction.predicted_wage) {
      const dailyRate = prediction.predicted_wage;
      const totalEstimated = dailyRate * 1; // Default to 1 worker if workersNeeded is removed
      
      setFormData(prev => ({
        ...prev,
        wageCalculation: {
          ratePerDay: dailyRate,
          totalEstimated
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Create job data object that matches backend expectations
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: mlPrediction?.jobType?.toLowerCase() || 'general',
        jobType: mlPrediction?.jobType || '',
        workersNeeded: 1, // Default to 1 worker
        duration: {
          estimated: 1,
          unit: 'days'
        },
        location: {
          address: 'Auto-detected location',
          city: mlPrediction?.location || 'Guntur',
          state: 'Andhra Pradesh',
          pincode: '522001',
          coordinates: {
            latitude: 16.3061,
            longitude: 80.4368
          }
        },
        experience: mlPrediction?.experience || '',
        skillLevel: mlPrediction?.skillLevel || '',
        urgency: 'medium',
        wageCalculation: {
          ratePerDay: mlPrediction?.predicted_wage || 0,
          totalEstimated: formData.wageCalculation?.totalEstimated || mlPrediction?.predicted_wage || 0
        }
      };

      console.log('🚀 Posting job with data:', jobData);
      
      const response = await api.post('/jobs', jobData);
      
      if (response.data.success) {
        alert(`✅ Job posted successfully! Job ID: ${response.data.jobId}`);
        navigate('/employer/dashboard');
      } else {
        alert('❌ ' + (response.data.message || 'Failed to post job'));
      }
    } catch (err) {
      console.error('🚨 Job posting error:', err);
      alert('❌ ' + (err.response?.data?.message || err.message || 'Failed to post job'));
    }
  };

  return (
    <div className="post-job-container">
      <h1>Post a New Job</h1>
      
      {/* Show pre-selected category indicator */}
      {location.state?.categoryName && (
        <div className="preselected-category">
          <span className="category-indicator">
            🎯 Category: <strong>{location.state.categoryName}</strong>
          </span>
          <span className="category-hint">You can change this if needed</span>
        </div>
      )}
      
      {/* Show auto-detected location indicator */}
      {locationDetected && (
        <div className="location-detected">
          <span className="location-indicator">
            📍 Auto-detected: <strong>Guntur, Andhra Pradesh</strong>
          </span>
          <span className="location-hint">Based on your current location</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="job-form">
        
        {/* ML Wage Prediction Component */}
        <MLWagePrediction 
          onPredictionComplete={handleMLPredictionComplete} 
          onLocationChange={handleLocationChange}
        />

        <div className="form-grid">
          <div className="form-group">
            <label>Job Title</label>
            <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Need House Painting" />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} required rows="4" placeholder="Describe the work details..."></textarea>
        </div>

        {mlPrediction && (
          <div className="estimation-card">
            <h3>💰 Estimated Cost: ₹{formData.wageCalculation?.totalEstimated || 0}</h3>
            <div className="estimation-breakdown">
              <div className="breakdown-item">
                <span>Daily Rate (ML Predicted)</span>
                <span>₹{mlPrediction.predicted_wage}</span>
              </div>
              <div className="breakdown-item">
                <span>Total Estimated Cost</span>
                <span>₹{formData.wageCalculation?.totalEstimated || 0}</span>
              </div>
            </div>
            <p className="estimation-note">* This is an ML-based estimate. Actual rates may be negotiated with workers.</p>
          </div>
        )}

        <button type="submit" className="submit-btn">Post Job</button>
      </form>
    </div>
  );
};

export default PostJob;
