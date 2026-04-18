import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import RatingModal from '../components/RatingModal';
import './JobDetails.css';

const JobDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hiringId, setHiringId] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userToRate, setUserToRate] = useState(null);
  const [applicationData, setApplicationData] = useState({
    proposedRate: 0,
    message: ''
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await api.get(`/jobs/${id}`);
        setJob(response.data.job);
        setApplicationData({
          ...applicationData,
          proposedRate: response.data.job.wageCalculation.totalEstimated
        });
      } catch (error) {
        console.error('Error fetching job:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/workers/apply/${id}`, applicationData);
      alert('Application submitted successfully!');
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data.job);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to apply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHire = async (workerId, rate, role = 'worker') => {
    setHiringId(workerId);
    try {
      await api.post(`/jobs/${id}/assign`, {
        workerIds: [workerId],
        roles: [role],
        rates: [rate]
      });
      alert('Worker hired successfully!');
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data.job);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to hire worker');
    } finally {
      setHiringId(null);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Are you sure the work is complete? This will finalize payments.')) return;
    try {
      await api.post(`/jobs/${id}/complete`);
      alert('Job marked as completed!');
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data.job);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to complete job');
    }
  };

  if (loading) return <div className="loading">Loading job details...</div>;
  if (!job) return <div className="no-data">Job not found</div>;

  const isEmployer = user.role === 'employer' && job.employer._id === user.id;
  const hasApplied = job.applications?.some(app => app.worker._id === user.id);

  const handleRatingSuccess = () => {
    // Optionally refresh job data or show success state
    api.get(`/jobs/${id}`).then(res => setJob(res.data.job));
  };

  return (
    <div className="job-details-container">
      {showRatingModal && userToRate && (
        <RatingModal
          jobId={id}
          ratedUserId={userToRate.id}
          ratedUserName={userToRate.name}
          onClose={() => setShowRatingModal(false)}
          onRatingSuccess={handleRatingSuccess}
        />
      )}
      <div className="job-header">
        <div className="title-section">
          <h1>{job.title}</h1>
          <span className={`status-badge ${job.status}`}>{job.status}</span>
        </div>
        <div className="employer-mini-card">
          <p>Posted by: <strong>{job.employer.name}</strong></p>
          <p>Location: {job.location.address}, {job.location.city}</p>
        </div>
      </div>

      <div className="job-grid">
        <div className="job-main">
          <section className="detail-section">
            <h3>Description</h3>
            <p>{job.description}</p>
          </section>

          <section className="detail-section">
            <h3>Requirements</h3>
            <ul className="requirements-list">
              {job.requiredSkills.map((skill, i) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>
          </section>

          {user.role === 'worker' && job.status === 'open' && !hasApplied && (
            <section className="apply-section">
              <h3>Apply for this Job</h3>
              <form onSubmit={handleApply}>
                <div className="form-group">
                  <label>Proposed Rate (₹)</label>
                  <input
                    type="number"
                    value={applicationData.proposedRate}
                    onChange={(e) => setApplicationData({...applicationData, proposedRate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Message to Employer</label>
                  <textarea
                    value={applicationData.message}
                    onChange={(e) => setApplicationData({...applicationData, message: e.target.value})}
                    placeholder="Tell the employer about your experience..."
                    rows="4"
                  />
                </div>
                <button type="submit" className="apply-btn" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </section>
          )}

          {isEmployer && job.status === 'open' && (
            <section className="applications-section">
              <h3>Worker Applications ({job.applications?.length || 0})</h3>
              <div className="apps-list">
                {job.applications?.length > 0 ? (
                  job.applications.map(app => (
                    <div key={app._id} className="app-item">
                      <div className="worker-brief">
                        <strong>{app.worker.name}</strong>
                        <div className="worker-stats">
                          <span>⭐ {app.worker.rating?.average || 0}</span>
                          <span>Exp: {app.worker.experience?.years}y</span>
                        </div>
                      </div>
                      <div className="app-content">
                        <p className="app-msg">"{app.message}"</p>
                        <p className="app-rate">Proposed: <strong>₹{app.proposedRate}</strong></p>
                      </div>
                      <button 
                        className="hire-btn" 
                        onClick={() => handleHire(app.worker._id, app.proposedRate)}
                        disabled={hiringId === app.worker._id}
                      >
                        {hiringId === app.worker._id ? 'Hiring...' : 'Hire Now'}
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No applications yet. Matching workers have been notified.</p>
                )}
              </div>
            </section>
          )}

          {job.status === 'completed' && (
            <section className="completed-section">
              <div className="completion-badge">This job was completed on {new Date(job.actualEndDate).toLocaleDateString()}</div>
              {isEmployer && job.assignedWorkers.map(assigned => (
                <button 
                  key={assigned.worker._id}
                  className="rate-btn"
                  onClick={() => {
                    setUserToRate({ id: assigned.worker._id, name: assigned.worker.name });
                    setShowRatingModal(true);
                  }}
                >
                  Rate {assigned.worker.name}
                </button>
              ))}
              {user.role === 'worker' && (
                <button 
                  className="rate-btn"
                  onClick={() => {
                    setUserToRate({ id: job.employer._id, name: job.employer.name });
                    setShowRatingModal(true);
                  }}
                >
                  Rate Employer
                </button>
              )}
            </section>
          )}

          {(job.status === 'assigned' || job.status === 'in-progress') && (
            <section className="assigned-workers-section">
              <h3>Assigned Workers</h3>
              <div className="assigned-list">
                {job.assignedWorkers.map(assigned => (
                  <div key={assigned._id} className="assigned-item">
                    <span><strong>{assigned.worker.name}</strong> ({assigned.role})</span>
                    <span>Rate: ₹{assigned.agreedRate}</span>
                    <span className="contact-info">📞 {assigned.worker.phone}</span>
                  </div>
                ))}
              </div>
              {isEmployer && (
                <button className="complete-job-btn" onClick={handleComplete}>
                  Mark Job as Completed
                </button>
              )}
            </section>
          )}

          {hasApplied && <div className="info-badge">You have already applied for this job.</div>}
        </div>

        <div className="job-sidebar">
          <div className="pricing-card">
            <h3>Cost Estimation</h3>
            <div className="price-main">₹{job.wageCalculation.totalEstimated}</div>
            <p className="price-sub">For {job.duration.estimated} {job.duration.unit}</p>
            <div className="price-breakdown">
              {job.wageCalculation.breakdown.map((item, i) => (
                <div key={i} className="breakdown-row">
                  <span>{item.description}</span>
                  <span>{item.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="info-card">
            <h3>Job Details</h3>
            <p><strong>Category:</strong> {job.category}</p>
            <p><strong>Type:</strong> {job.jobType}</p>
            <p><strong>Workers Needed:</strong> {job.workersNeeded}</p>
            <p><strong>Expert Led:</strong> {job.needsExpert ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
