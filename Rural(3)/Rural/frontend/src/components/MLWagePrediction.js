import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './MLWagePrediction.css';

const MLWagePrediction = ({ onPredictionComplete, onLocationChange }) => {
  const [formData, setFormData] = useState({
    experience: '',
    location: '',
    jobType: '',
    skillLevel: ''
  });
  
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const skillLevels = ['beginner', 'intermediate', 'expert'];
  const jobTypes = ['Driver', 'Painter', 'Electrician', 'Plumber', 'Carpenter', 'Mason', 'Welder', 'Cleaner', 'Gardener', 'Constructor', 'Fabricator', 'Tiler'];

  const locations = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 
    'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
    'Jaipur', 'Lucknow', 'Surat', 'Kanpur'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    
    // If location changed, notify parent component
    if (name === 'location' && onLocationChange) {
      onLocationChange(value);
    }
  };

  const handlePredict = async () => {
    // Validate form
    if (!formData.experience || !formData.location || !formData.jobType || !formData.skillLevel) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Map frontend data to match your Sharmma Mitra ML model
      const mlData = {
        experience: formData.experience,
        location: formData.location,
        jobType: formData.jobType,
        skillLevel: formData.skillLevel
      };

      console.log('🤖 Sending to Sharmma Mitra ML:', mlData);

      const response = await api.post('/ml/predict-wage', mlData);
      
      if (response.data.success) {
        setPrediction(response.data.prediction);
        onPredictionComplete?.(response.data.prediction);
        
        // Log if using fallback
        if (response.data.fallback) {
          console.warn('⚠️ Using fallback prediction:', response.data.error);
        }
      } else {
        setError('Prediction failed. Please try again.');
      }
    } catch (err) {
      console.error('🚨 ML Prediction Error:', err);
      setError('Failed to get prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      experience: '',
      location: '',
      jobType: '',
      skillLevel: ''
    });
    setPrediction(null);
    setError('');
  };

  return (
    <div className="ml-wage-prediction">
      <div className="prediction-header">
        <h3>🤖 Sharmma Mitra ML Wage Prediction</h3>
        <p>Get accurate wage estimates using our trained ML model</p>
      </div>

      <div className="prediction-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Experience (years):</label>
            <input
              type="number"
              name="experience"
              value={formData.experience}
              onChange={handleInputChange}
              placeholder="e.g., 5"
              min="0"
              max="50"
            />
          </div>

          <div className="form-group">
            <label>Location:</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleInputChange}
            >
              <option value="">Select location</option>
              {locations.map(location => (
                <option key={location} value={location.toLowerCase()}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Job Type:</label>
            <select
              name="jobType"
              value={formData.jobType}
              onChange={handleInputChange}
            >
              <option value="">Select job type</option>
              {jobTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Skill Level:</label>
            <select
              name="skillLevel"
              value={formData.skillLevel}
              onChange={handleInputChange}
            >
              <option value="">Select skill level</option>
              {skillLevels.map(level => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="prediction-actions">
          <button 
            className="predict-btn" 
            onClick={handlePredict}
            disabled={loading}
          >
            {loading ? '🤖 Predicting...' : '🔮 Predict Wage'}
          </button>
          <button 
            className="reset-btn" 
            onClick={handleReset}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {prediction && (
        <div className="prediction-result">
          <h4>🎯 Prediction Result</h4>
          
          <div className="wage-display">
            <div className="main-wage">
              <span className="wage-amount">₹{prediction.predicted_wage}</span>
              <span className="wage-period">/day</span>
            </div>
            
            <div className="confidence">
              <span>Confidence: </span>
              <span className="confidence-score">
                {Math.round(prediction.confidence * 100)}%
              </span>
            </div>
          </div>

          {prediction.wage_range && (
            <div className="wage-range">
              <span>Range: </span>
              <span className="range-amount">
                ₹{prediction.wage_range.min} - ₹{prediction.wage_range.max}/day
              </span>
            </div>
          )}

          {prediction.factors && prediction.factors.length > 0 && (
            <div className="factors">
              <h5>📊 Factors Considered:</h5>
              <ul>
                {prediction.factors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {prediction.fallback && (
            <div className="fallback-notice">
              ℹ️ Using rule-based prediction (ML model unavailable)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MLWagePrediction;
