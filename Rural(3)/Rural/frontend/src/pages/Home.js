import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="hero">
        <div className="hero-content">
          <h1>Connect with Skilled Daily Wage Workers</h1>
          <p>Expert-led work execution, transparent pricing, and fair job distribution.</p>
          <div className="hero-buttons">
            <Link to="/register?role=employer" className="btn btn-primary">Hire Workers</Link>
            <Link to="/register?role=worker" className="btn btn-secondary">Find Work</Link>
          </div>
        </div>
      </header>

      <section className="services">
        <div className="container">
          <h2 className="section-title">Our Services</h2>
          <div className="services-grid">
            <Link to="/browse-workers?category=construction" className="service-card">
              <div className="service-icon">🔨</div>
              <h3>Construction Work</h3>
              <p>Skilled labor for building, renovation, and infrastructure projects</p>
            </Link>
            <Link to="/browse-workers?category=electrical" className="service-card">
              <div className="service-icon">🏠</div>
              <h3>Home Services</h3>
              <p>Plumbing, electrical, painting, and maintenance services</p>
            </Link>
            <Link to="/browse-workers?category=transportation" className="service-card">
              <div className="service-icon">🚗</div>
              <h3>Transportation</h3>
              <p>Drivers, loaders, and logistics support for goods movement</p>
            </Link>
            <Link to="/browse-workers?category=agriculture" className="service-card">
              <div className="service-icon">🌾</div>
              <h3>Agriculture</h3>
              <p>Farm workers, harvesting, and agricultural labor support</p>
            </Link>
            <Link to="/browse-workers?category=cleaning" className="service-card">
              <div className="service-icon">🧹</div>
              <h3>Cleaning Services</h3>
              <p>Commercial and residential cleaning professionals</p>
            </Link>
            <Link to="/browse-workers?category=packaging" className="service-card">
              <div className="service-icon">📦</div>
              <h3>Packaging & Moving</h3>
              <p>Expert packing, moving, and relocation services</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="process">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="process-steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Register</h3>
              <p>Create your account as employer or worker</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Post/Find Jobs</h3>
              <p>Employers post jobs, workers find matching opportunities</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Connect & Hire</h3>
              <p>Review profiles, chat, and hire the right talent</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Complete Work</h3>
              <p>Get work done with transparent pricing and fair wages</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose SkillConnect</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Expert Guidance</h3>
              <p>Get professional planning and estimation for your projects from experienced leads.</p>
            </div>
            <div className="feature-card">
              <h3>Fair Wages</h3>
              <p>Transparent cost calculation based on job type, size, and location.</p>
            </div>
            <div className="feature-card">
              <h3>Verified History</h3>
              <p>Hire based on experience, ratings, and actual work history instead of just certificates.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat">
              <h3>10,000+</h3>
              <p>Active Workers</p>
            </div>
            <div className="stat">
              <h3>5,000+</h3>
              <p>Jobs Completed</p>
            </div>
            <div className="stat">
              <h3>500+</h3>
              <p>Verified Employers</p>
            </div>
            <div className="stat">
              <h3>4.8★</h3>
              <p>Average Rating</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of workers and employers already using SkillConnect</p>
          <div className="cta-buttons">
            <Link to="/register?role=employer" className="btn btn-primary btn-large">Post a Job</Link>
            <Link to="/register?role=worker" className="btn btn-secondary btn-large">Find Work</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
