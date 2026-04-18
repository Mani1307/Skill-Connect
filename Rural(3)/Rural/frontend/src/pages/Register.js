import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import './Auth.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'worker',
    location: {
      address: '',
      city: '',
      district: '',
      state: '',
      pincode: ''
    },
    skills: [],
    experience: { years: 0 },
    age: '',
    gender: ''
  });
  const [profileFile, setProfileFile] = useState(null);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const skillOptions = ['painter', 'electrician', 'mason', 'helper', 'plumber', 'carpenter', 'welder', 'cleaner', 'gardener', 'loader', 'fabricator', 'tiler'];

  // OTP Timer Effect
  React.useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('location.')) {
      const field = name.split('.')[1];
      setFormData({ ...formData, location: { ...formData.location, [field]: value } });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSkillToggle = (skill) => {
    const skills = formData.skills.includes(skill)
      ? formData.skills.filter(s => s !== skill)
      : [...formData.skills, skill];
    setFormData({ ...formData, skills });
  };

  const sendOtp = async () => {
    if (!formData.email) {
      setError('Please enter your email first');
      return;
    }
    
    try {
      setError('');
      const response = await api.post('/auth/send-otp', { email: formData.email });
      if (response.data.success) {
        setIsOtpSent(true);
        setOtpTimer(600); // 10 minutes
        setError('OTP sent to your email!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending OTP');
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    
    try {
      setError('');
      const response = await api.post('/auth/verify-otp', { 
        email: formData.email, 
        otp: otp 
      });
      if (response.data.success) {
        setIsEmailVerified(true);
        setError('Email verified successfully!');
        setTimeout(() => {
          setStep(2);
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting registration, role:', formData.role, 'step:', step);
    console.log('Form data:', formData);
    
    // Validation for step 3 submission
    if (step !== 3) return;
    
    setError('');

    let result;
    // If there's a profile photo, use FormData (multipart/form-data)
    if (profileFile) {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('password', formData.password);
      data.append('role', formData.role);
      data.append('location', JSON.stringify(formData.location));

      if (formData.role === 'worker') {
        data.append('skills', JSON.stringify(formData.skills));
        data.append('experience', JSON.stringify(formData.experience));
        data.append('age', formData.age);
        data.append('gender', formData.gender);
      }

      data.append('profileImage', profileFile);
      result = await register(data);
    } else {
      // If no photo, send as regular JSON
      const submitData = { ...formData };
      if (formData.role === 'worker') {
        submitData.age = formData.age;
        submitData.gender = formData.gender;
      }
      result = await register(submitData);
    }

    if (result.success) {
      if (result.user.role === 'worker') {
        navigate('/worker/dashboard');
      } else {
        navigate('/employer/dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>
          {step === 1 && 'Create Your Account'}
          {step === 2 && 'Professional Details'}
          {step === 3 && 'Final Confirmation'}
        </h2>
        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email Address *</label>
                <div className="email-verification">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isEmailVerified}
                  />
                  {!isEmailVerified ? (
                    <button 
                      type="button" 
                      onClick={sendOtp}
                      className="send-otp-btn"
                      disabled={!formData.email || isOtpSent || otpTimer > 0}
                    >
                      {isOtpSent ? 'OTP Sent' : 'Send OTP'}
                    </button>
                  ) : (
                    <span className="verified-badge">✓ Verified</span>
                  )}
                </div>
                
                {isOtpSent && !isEmailVerified && (
                  <div className="otp-section">
                    <div className="otp-timer">
                      Expires in: {formatTime(otpTimer)}
                    </div>
                    <div className="otp-input-container">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        maxLength="6"
                        className="otp-input"
                      />
                      <button 
                        type="button" 
                        onClick={verifyOtp}
                        className="verify-otp-btn"
                      >
                        Verify OTP
                      </button>
                    </div>
                    {otpTimer === 0 && (
                      <button 
                        type="button" 
                        onClick={sendOtp}
                        className="resend-otp-btn"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength="6"
                />
              </div>
              
              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  name="location.address"
                  value={formData.location.address}
                  onChange={handleChange}
                  placeholder="Full street address"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="location.city"
                    value={formData.location.city}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>District *</label>
                  <input
                    type="text"
                    name="location.district"
                    value={formData.location.district}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    name="location.state"
                    value={formData.location.state}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    name="location.pincode"
                    value={formData.location.pincode}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>I am a:</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="worker">Worker / Skilled Laborer</option>
                  <option value="employer">Employer / Home Owner</option>
                </select>
              </div>
              
              <button 
                type="button" 
                className="auth-btn"
                onClick={() => {
                  if (isEmailVerified) {
                    setStep(2);
                  } else {
                    setError('Please verify your email first');
                  }
                }}
                disabled={!isEmailVerified}
              >
                Continue to Step 2
              </button>
            </>
          ) : step === 2 ? (
            <>
              <div className="form-group">
                <label>Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileFile(e.target.files[0])}
                />
              </div>

              {formData.role === 'worker' && (
                <>
                  <div className="form-group">
                    <label>Select Your Skills (Select multiple) *</label>
                    <div className="skills-grid">
                      {skillOptions.map(skill => (
                        <label key={skill} className="skill-checkbox">
                          <input
                            type="checkbox"
                            checked={formData.skills.includes(skill)}
                            onChange={() => handleSkillToggle(skill)}
                          />
                          <span>{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Years of Experience *</label>
                      <input
                        type="number"
                        name="experience.years"
                        value={formData.experience.years}
                        onChange={(e) => setFormData({...formData, experience: { years: parseInt(e.target.value) || 0 }})}
                        min="0"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Age *</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        min="18"
                        max="80"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} required>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="button" className="back-btn" onClick={() => setStep(1)}>Back</button>
                <button 
                  type="button" 
                  className="auth-btn" 
                  onClick={() => setStep(3)}
                >
                  Continue to Review
                </button>
              </div>
            </>
          ) : (
            // Step 3 - Final Review
            <>
              <div className="review-section">
                <h3>Review Your Information</h3>
                
                <div className="review-item">
                  <strong>Name:</strong> {formData.name}
                </div>
                <div className="review-item">
                  <strong>Email:</strong> {formData.email}
                </div>
                <div className="review-item">
                  <strong>Phone:</strong> {formData.phone}
                </div>
                <div className="review-item">
                  <strong>Role:</strong> {formData.role === 'worker' ? 'Worker' : 'Employer'}
                </div>
                
                {formData.role === 'worker' && (
                  <>
                    <div className="review-item">
                      <strong>Skills:</strong> {formData.skills.join(', ') || 'None selected'}
                    </div>
                    <div className="review-item">
                      <strong>Experience:</strong> {formData.experience.years} years
                    </div>
                    <div className="review-item">
                      <strong>Age:</strong> {formData.age} years
                    </div>
                    <div className="review-item">
                      <strong>Gender:</strong> {formData.gender}
                    </div>
                  </>
                )}
                
                <div className="review-item">
                  <strong>Address:</strong> {formData.location.address}, {formData.location.city}, {formData.location.district}, {formData.location.state} - {formData.location.pincode}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="back-btn" onClick={() => setStep(2)}>Back</button>
                <button type="submit" className="auth-btn">Complete Registration</button>
              </div>
            </>
          )}
        </form>
        {step === 1 && (
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Register;
