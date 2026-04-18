import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { adminLogin, adminCredentials, testAdmins } from '../utils/adminCredentials';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Check if it's admin login first
    if (formData.email.includes('@skillconnect.com') || 
        formData.email === adminCredentials.email ||
        testAdmins.some(admin => admin.email === formData.email)) {
      
      const adminResult = await adminLogin(formData.email, formData.password);
      if (adminResult.success) {
        // Update AuthContext with admin user
        const loginResult = await login(formData);
        if (loginResult.success) {
          navigate('/admin/dashboard');
          return;
        }
      } else {
        setError(adminResult.message);
        return;
      }
    }
    
    // Regular user login
    const result = await login(formData);
    if (result.success) {
      if (result.user.role === 'worker') {
        navigate('/worker/dashboard');
      } else if (result.user.role === 'employer') {
        navigate('/employer/dashboard');
      } else if (result.user.role === 'admin') {
        navigate('/admin/dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to SkillConnect</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address / Phone</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email or phone"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="auth-btn">Login</button>
        </form>
        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
          <p>
            <Link to="/forgot-password">Forgot Password?</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
