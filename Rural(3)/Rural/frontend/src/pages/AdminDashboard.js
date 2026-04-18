import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [mapPosition, setMapPosition] = useState({
    lat: 20.5937,
    lng: 78.9629
  });
  const [isMapVisible, setIsMapVisible] = useState(false);

  // Reports & Complaints State
  const [complaints, setComplaints] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [fraudReports, setFraudReports] = useState([]);
  const [complaintFilter, setComplaintFilter] = useState('all');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    userGrowth: [],
    jobStats: {},
    locationDemand: {},
    userDistribution: {},
    platformMetrics: {}
  });
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30days');

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    totalEmployers: 0,
    verifiedWorkers: 0,
    pendingApprovals: 0,
    activeJobs: 0,
    flaggedJobs: 0
  });
  // User Management State
  const [userFilter, setUserFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  // Worker Verification State
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Job Management State
  const [jobFilter, setJobFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);

  // Live Audit Log State
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, action: "New worker registered", user: "John Doe", time: "2 mins ago", type: "info" },
    { id: 2, action: "Job marked complete", user: "ABC Corp", time: "15 mins ago", type: "success" },
    { id: 3, action: "Suspicious activity detected", user: "Jane Smith", time: "1 hour ago", type: "warning" },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, [activeSection]);

  // Fetch Reports & Complaints Data
  const fetchComplaints = async () => {
    try {
      console.log('🔍 Fetching complaints...');
      const query = complaintFilter !== 'all' ? `?type=${complaintFilter}` : '';
      const response = await api.get(`/admin/complaints${query}`);
      console.log('📥 Complaints API response:', response.data);

      if (response.data.success) {
        setComplaints(response.data.complaints || []);
        console.log(`✅ Fetched ${response.data.complaints?.length || 0} complaints`);
      } else {
        console.error('❌ Complaints API returned error:', response.data.message);
        setComplaints([]);
      }
    } catch (error) {
      console.error('❌ Error fetching complaints:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set mock data as fallback
      setComplaints([
        {
          _id: 'complaint1',
          type: 'worker',
          title: 'Employer didn\'t pay wages',
          description: 'I worked for 3 days but employer refused to pay my daily wages of ₹800 per day.',
          complainant: { name: 'Ramesh Kumar', email: 'ramesh@example.com' },
          target: { name: 'ABC Construction', email: 'abc@example.com' },
          status: 'pending',
          priority: 'high',
          createdAt: new Date('2024-01-15')
        },
        {
          _id: 'complaint2',
          type: 'employer',
          title: 'Worker didn\'t show up',
          description: 'The worker confirmed to come but never showed up on job site.',
          complainant: { name: 'XYZ Builders', email: 'xyz@example.com' },
          target: { name: 'Suresh Singh', email: 'suresh@example.com' },
          status: 'investigating',
          priority: 'medium',
          createdAt: new Date('2024-01-14')
        }
      ]);
    }
  };

  // Fetch Analytics Data
  const fetchAnalytics = async () => {
    try {
      console.log('📊 Fetching analytics...');
      const response = await api.get(`/admin/analytics?period=${analyticsPeriod}`);
      console.log('📥 Analytics API response:', response.data);

      if (response.data.success && response.data.analytics) {
        setAnalyticsData(response.data.analytics);
        console.log('✅ Analytics fetched successfully');
      } else {
        console.error('❌ Analytics API returned error or no data');
        // Don't set any fallback data - only use real API data
        setAnalyticsData({
          userGrowth: [],
          jobStats: { byCategory: {}, byStatus: {} },
          locationDemand: {},
          userDistribution: { workers: 0, employers: 0, admin: 0 },
          platformMetrics: { totalUsers: 0, activeUsers: 0, jobsCompleted: 0, dailyGrowth: 0 }
        });
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Don't set mock data - only use real API data
      setAnalyticsData({
        userGrowth: [],
        jobStats: { byCategory: {}, byStatus: {} },
        locationDemand: {},
        userDistribution: { workers: 0, employers: 0, admin: 0 },
        platformMetrics: { totalUsers: 0, activeUsers: 0, jobsCompleted: 0, dailyGrowth: 0 }
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (activeSection === 'users') {
        await fetchUsers();
      } else if (activeSection === 'verification') {
        await fetchWorkersForVerification();
      } else if (activeSection === 'jobs') {
        await fetchJobs();
      } else if (activeSection === 'complaints') {
        await fetchComplaints();
      } else if (activeSection === 'analytics') {
        await fetchAnalytics();
      }

      await fetchStats();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('🔍 Fetching admin stats...');
      const response = await api.get('/admin/stats');
      console.log('📥 Stats API response:', response.data);

      if (response.data.success) {
        setStats(response.data.stats);
        console.log('✅ Stats fetched successfully');
      } else {
        console.error('❌ Stats API returned error:', response.data.message);
        // Set default values if API fails
        setStats({
          totalUsers: 0,
          totalWorkers: 0,
          totalEmployers: 0,
          verifiedWorkers: 0,
          pendingApprovals: 0,
          activeJobs: 0,
          flaggedJobs: 0
        });
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set default values if API fails
      setStats({
        totalUsers: 0,
        totalWorkers: 0,
        totalEmployers: 0,
        verifiedWorkers: 0,
        pendingApprovals: 0,
        activeJobs: 0,
        flaggedJobs: 0
      });
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching users with filter:', userFilter);
      const query = userFilter !== 'all' ? `?role=${userFilter}` : '';
      const response = await api.get(`/admin/users${query}`);
      console.log('📥 Users API response:', response.data);

      if (response.data.success) {
        setUsers(response.data.users);
        console.log(`✅ Fetched ${response.data.users.length} users`);
      } else {
        console.error('❌ API returned error:', response.data.message);
        setUsers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty array if API fails
      setUsers([]);
    }
  };

  const fetchWorkersForVerification = async () => {
    try {
      const query = verificationFilter !== 'all' ? `?status=${verificationFilter}` : '';
      const response = await api.get(`/admin/workers/verification${query}`);
      if (response.data.success) {
        setUsers(response.data.workers);
      }
    } catch (error) {
      console.error('Error fetching workers for verification:', error);
      // Set empty array if API fails
      setUsers([]);
    }
  };

  const fetchJobs = async () => {
    try {
      const query = jobFilter !== 'all' ? `?status=${jobFilter}` : '';
      const response = await api.get(`/admin/jobs${query}`);
      if (response.data.success) {
        setJobs(response.data.jobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Set empty array if API fails
      setJobs([]);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      const response = await api.post(`/admin/users/${userId}/${action}`);
      if (response.data.success) {
        alert(`✅ User ${action} successfully!`);
        fetchUsers();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to perform action'}`);
    }
  };

  const handleWorkerVerification = async (workerId, action) => {
    try {
      const response = await api.post(`/admin/workers/${workerId}/verify`, { action });
      if (response.data.success) {
        alert(`✅ Worker ${action} successfully!`);
        fetchWorkersForVerification();
        fetchStats();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to verify worker'}`);
    }
  };

  const handleJobAction = async (jobId, action) => {
    try {
      const response = await api.post(`/admin/jobs/${jobId}/${action}`);
      if (response.data.success) {
        alert(`✅ Job ${action} successfully!`);
        fetchJobs();
        fetchStats();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to perform action'}`);
    }
  };

  // Complaint & Dispute Handling Functions
  const handleComplaintAction = async (complaintId, action) => {
    try {
      const response = await api.post(`/admin/complaints/${complaintId}/${action}`);
      if (response.data.success) {
        alert(`✅ Complaint ${action} successfully!`);
        fetchComplaints();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to perform action'}`);
    }
  };

  const handleDisputeAction = async (disputeId, action) => {
    try {
      const response = await api.post(`/admin/disputes/${disputeId}/${action}`);
      if (response.data.success) {
        alert(`✅ Dispute ${action} successfully!`);
        fetchComplaints();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to perform action'}`);
    }
  };

  const handleFraudAction = async (fraudId, action) => {
    try {
      const response = await api.post(`/admin/fraud/${fraudId}/${action}`);
      if (response.data.success) {
        alert(`✅ Fraud report ${action} successfully!`);
        fetchComplaints();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to perform action'}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.phone.includes(userSearch);
    return matchesSearch;
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.employer.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.location.toLowerCase().includes(jobSearch.toLowerCase());
    return matchesSearch;
  });

  const renderSidebar = () => (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <div className="admin-avatar">
          <span>👨‍💼</span>
        </div>
        <h3>Admin Panel</h3>
        <p>{user?.name || 'Administrator'}</p>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveSection('dashboard')}
        >
          <span className="nav-icon">📊</span>
          <span>Dashboard</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSection('users')}
        >
          <span className="nav-icon">👥</span>
          <span>User Management</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'verification' ? 'active' : ''}`}
          onClick={() => setActiveSection('verification')}
        >
          <span className="nav-icon">✅</span>
          <span>Worker Verification</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveSection('jobs')}
        >
          <span className="nav-icon">💼</span>
          <span>Job Management</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveSection('complaints')}
        >
          <span className="nav-icon">🚨</span>
          <span>Reports & Complaints</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveSection('analytics')}
        >
          <span className="nav-icon">📈</span>
          <span>Analytics & Insights</span>
        </button>
      </nav>
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>📊 Admin Dashboard</h1>
        <p>Platform overview and statistics</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{stats.totalUsers.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">👨‍🔧</div>
          <div className="stat-content">
            <h3>Total Workers</h3>
            <p className="stat-value">{stats.totalWorkers.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>Total Employers</h3>
            <p className="stat-value">{stats.totalEmployers.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Verified Workers</h3>
            <p className="stat-value">{stats.verifiedWorkers.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending Approvals</h3>
            <p className="stat-value">{stats.pendingApprovals}</p>
          </div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-icon">💼</div>
          <div className="stat-content">
            <h3>Active Jobs</h3>
            <p className="stat-value">{stats.activeJobs.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <button className="action-card" onClick={() => setActiveSection('users')}>
            <span className="action-icon">👥</span>
            <h3>Manage Users</h3>
            <p>Approve, block, or edit user accounts</p>
          </button>
          <button className="action-card" onClick={() => setActiveSection('verification')}>
            <span className="action-icon">✅</span>
            <h3>Verify Workers</h3>
            <p>Review worker verification requests</p>
          </button>
          <button className="action-card" onClick={() => setActiveSection('jobs')}>
            <span className="action-icon">💼</span>
            <h3>Manage Jobs</h3>
            <p>Monitor and moderate job postings</p>
          </button>
        </div>
      </div>

      <div className="live-audit-section">
        <div className="audit-header">
          <h2>🔴 Live Audit Log</h2>
          <span className="live-indicator">Tracking</span>
        </div>
        <div className="audit-list">
          {auditLogs.map(log => (
            <div key={log.id} className={`audit-item ${log.type}`}>
              <span className="audit-dot"></span>
              <div className="audit-content">
                <strong>{log.action}</strong> by {log.user}
                <span className="audit-time">{log.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div className="users-page">
      <div className="page-header">
        <h1>👥 User Management</h1>
        <p>Manage all registered users on the platform</p>
      </div>

      <div className="controls-section">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Users</option>
            <option value="worker">Workers</option>
            <option value="employer">Employers</option>
          </select>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User Details</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Location</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user._id}>
                <td className="user-info">
                  <div className="user-avatar">
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="user-details">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                    <small>{user.phone}</small>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'worker' ? '👨‍🔧 Worker' : user.role === 'employer' ? '🏢 Employer' : '👨‍💼 Admin'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'blocked'}`}>
                    {user.isActive ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td>
                  <span className={`verification-badge ${user.identityProof?.type ? 'verified' : 'unverified'}`}>
                    {user.identityProof?.type ? '✅ Verified' : '❌ Unverified'}
                  </span>
                </td>
                <td>{user.location?.city ? `${user.location.city}, ${user.location.state || ''}` : 'Not specified'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button
                    className="action-btn edit"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowUserModal(true);
                    }}
                  >
                    ✏️
                  </button>
                  {user.isActive ? (
                    <button
                      className="action-btn block"
                      onClick={() => handleUserAction(user._id, 'block')}
                    >
                      🚫
                    </button>
                  ) : (
                    <button
                      className="action-btn unblock"
                      onClick={() => handleUserAction(user._id, 'unblock')}
                    >
                      ✅
                    </button>
                  )}
                  <button
                    className="action-btn delete"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this user?')) {
                        handleUserAction(user._id, 'delete');
                      }
                    }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWorkerVerification = () => (
    <div className="verification-page">
      <div className="page-header">
        <h1>✅ Worker Verification</h1>
        <p>Verify worker identities and skill certificates</p>
      </div>

      <div className="controls-section">
        <div className="search-filter">
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Workers</option>
            <option value="pending">Pending Verification</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="verification-grid">
        {users.map(worker => (
          <div key={worker._id} className="verification-card">
            <div className="worker-header">
              <div className="worker-avatar">
                <span>{worker.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="worker-info">
                <h3>{worker.name}</h3>
                <p>{worker.email}</p>
                <small>{worker.phone}</small>
              </div>
              <div className="verification-status">
                <span className={`status-badge ${worker.verificationStatus || 'pending'}`}>
                  {worker.verificationStatus || 'pending'}
                </span>
              </div>
            </div>

            <div className="worker-details">
              <div className="detail-row">
                <span className="label">📍 Location:</span>
                <span className="value">{worker.location?.city ? `${worker.location.city}, ${worker.location.state || ''}` : 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="label">🆔 ID Proof:</span>
                <span className="value">{worker.identityProof?.type ? `${worker.identityProof.type} - ${worker.identityProof.documentType || 'Uploaded'}` : 'Not uploaded'}</span>
              </div>
              <div className="detail-row">
                <span className="label">🛠️ Skills:</span>
                <span className="value">{worker.skills?.join(', ') || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="label">💼 Experience:</span>
                <span className="value">{worker.experience?.years ? `${worker.experience.years} years` : 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="label">⭐ Rating:</span>
                <span className="value">{worker.rating?.average ? `${worker.rating.average}/5 (${worker.rating.count} reviews)` : 'No ratings yet'}</span>
              </div>
            </div>

            <div className="verification-actions">
              {(!worker.verificationStatus || worker.verificationStatus === 'pending') && (
                <>
                  <button
                    className="verify-btn approve"
                    onClick={() => handleWorkerVerification(worker._id, 'approve')}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="verify-btn reject"
                    onClick={() => handleWorkerVerification(worker._id, 'reject')}
                  >
                    ❌ Reject
                  </button>
                </>
              )}
              {worker.verificationStatus === 'verified' && (
                <button
                  className="verify-btn revoke"
                  onClick={() => handleWorkerVerification(worker._id, 'revoke')}
                >
                  🔄 Revoke Verification
                </button>
              )}
              <button
                className="verify-btn view"
                onClick={() => {
                  setSelectedWorker(worker);
                  setShowVerificationModal(true);
                }}
              >
                👁️ View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReportsAndComplaints = () => (
    <div className="complaints-page">
      <div className="page-header">
        <h1>🚨 Reports & Complaints Management</h1>
        <p>Handle worker complaints, employer disputes, fraud reports, and payment disputes</p>
      </div>

      <div className="controls-section">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search complaints by title, user, or description..."
            value={complaintSearch}
            onChange={(e) => setComplaintSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={complaintFilter}
            onChange={(e) => setComplaintFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Complaints</option>
            <option value="worker">Worker Complaints</option>
            <option value="employer">Employer Complaints</option>
            <option value="payment">Payment Disputes</option>
            <option value="fraud">Fraud Reports</option>
          </select>
        </div>
      </div>

      <div className="complaints-grid">
        {complaints.map(complaint => (
          <div key={complaint._id} className="complaint-card">
            <div className="complaint-header">
              <div className="complaint-type">
                <span className={`type-badge ${complaint.type}`}>
                  {complaint.type === 'worker' ? '👨‍🔧 Worker' :
                    complaint.type === 'employer' ? '🏢 Employer' :
                      complaint.type === 'payment' ? '💳 Payment' :
                        complaint.type === 'fraud' ? '🚨 Fraud' : '📋 General'}
                </span>
              </div>
              <div className="complaint-status">
                <span className={`status-badge ${complaint.status}`}>
                  {complaint.status}
                </span>
              </div>
              <div className="complaint-priority">
                <span className={`priority-badge ${complaint.priority}`}>
                  {complaint.priority}
                </span>
              </div>
            </div>

            <div className="complaint-content">
              <h3>{complaint.title}</h3>
              <p className="complaint-description">{complaint.description}</p>

              <div className="complaint-details">
                <div className="detail-row">
                  <span className="label">👤 Complainant:</span>
                  <span className="value">{complaint.complainant?.name || 'Anonymous'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">🎯 Target:</span>
                  <span className="value">{complaint.target?.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📅 Date:</span>
                  <span className="value">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="label">🆔 ID:</span>
                  <span className="value">#{complaint._id.slice(-6)}</span>
                </div>
              </div>
            </div>

            <div className="complaint-actions">
              {complaint.status === 'pending' && (
                <>
                  <button
                    className="complaint-btn investigate"
                    onClick={() => handleComplaintAction(complaint._id, 'investigate')}
                  >
                    🔍 Investigate
                  </button>
                  <button
                    className="complaint-btn warn"
                    onClick={() => handleComplaintAction(complaint._id, 'warn')}
                  >
                    ⚠️ Warn User
                  </button>
                </>
              )}
              {complaint.status === 'investigating' && (
                <>
                  <button
                    className="complaint-btn resolve"
                    onClick={() => handleComplaintAction(complaint._id, 'resolve')}
                  >
                    ✅ Resolve
                  </button>
                  <button
                    className="complaint-btn suspend"
                    onClick={() => handleComplaintAction(complaint._id, 'suspend')}
                  >
                    🚫 Suspend Account
                  </button>
                </>
              )}
              <button
                className="complaint-btn view"
                onClick={() => {
                  setSelectedComplaint(complaint);
                  setShowComplaintModal(true);
                }}
              >
                👁️ View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const renderJobManagement = () => (
    <div className="jobs-page">
      <div className="page-header">
        <h1>💼 Job Management</h1>
        <p>Monitor and manage all job postings</p>
      </div>

      <div className="controls-section">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search jobs by title, employer, or location..."
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Jobs</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </div>

      <div className="jobs-table-container">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Job Details</th>
              <th>Category</th>
              <th>Employer</th>
              <th>Location</th>
              <th>Wage</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map(job => (
              <tr key={job._id} className={job.flagged ? 'flagged-row' : ''}>
                <td className="job-info">
                  <h4>{job.title}</h4>
                  {job.flagged && (
                    <span className="flag-reason">
                      ⚠️ {job.flagReason}
                    </span>
                  )}
                </td>
                <td>
                  <span className="category-badge">
                    {job.category || 'General'}
                  </span>
                </td>
                <td>{job.employer?.name || job.employer?.companyName || 'Unknown'}</td>
                <td>{job.location?.city ? `${job.location.city}, ${job.location.state || ''}` : 'Not specified'}</td>
                <td className="wage">
                  {job.wage?.type === 'daily' ? `₹${job.wage?.amount}/day` :
                    job.wage?.type === 'hourly' ? `₹${job.wage?.amount}/hour` :
                      job.wage?.type === 'fixed' ? `₹${job.wage?.amount}` : 'Not specified'}
                </td>
                <td>
                  <span className={`status-badge ${job.status}`}>
                    {job.status}
                  </span>
                </td>
                <td>{job.applicants?.length || 0}</td>
                <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button
                    className="action-btn edit"
                    onClick={() => {
                      setSelectedJob(job);
                      setShowJobModal(true);
                    }}
                  >
                    ✏️
                  </button>
                  {job.status === 'active' ? (
                    <button
                      className="action-btn close"
                      onClick={() => handleJobAction(job._id, 'close')}
                    >
                      🚫
                    </button>
                  ) : (
                    <button
                      className="action-btn reopen"
                      onClick={() => handleJobAction(job._id, 'reopen')}
                    >
                      ✅
                    </button>
                  )}
                  <button
                    className="action-btn delete"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this job?')) {
                        handleJobAction(job._id, 'delete');
                      }
                    }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalyticsAndInsights = () => (
    <div className="analytics-page">
      <div className="page-header">
        <h1>📈 Analytics & Insights Dashboard</h1>
        <p>Visual statistics and platform metrics with interactive charts</p>
      </div>

      <div className="analytics-controls">
        <select
          value={analyticsPeriod}
          onChange={(e) => setAnalyticsPeriod(e.target.value)}
          className="period-select"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </div>

      <div className="analytics-grid">
        {/* Platform Metrics */}
        <div className="analytics-card metrics-card">
          <h3>📊 Platform Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Total Users</span>
              <span className="metric-value">{analyticsData.platformMetrics?.totalUsers?.toLocaleString() || stats.totalUsers.toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Active Users</span>
              <span className="metric-value">{analyticsData.platformMetrics?.activeUsers?.toLocaleString() || stats.totalUsers.toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Jobs Completed</span>
              <span className="metric-value">{analyticsData.platformMetrics?.jobsCompleted?.toLocaleString() || stats.activeJobs.toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Daily Growth</span>
              <span className="metric-value positive">+{analyticsData.platformMetrics?.dailyGrowth || 12.5}%</span>
            </div>
          </div>
        </div>

        {/* User Distribution Chart */}
        <div className="analytics-card chart-card">
          <h3>👥 User Distribution</h3>
          <div className="chart-container">
            <div className="pie-chart-placeholder">
              <div className="pie-chart">
                <div className="pie-segment workers" style={{ width: '60%', background: '#3b82f6' }}></div>
                <div className="pie-segment employers" style={{ width: '40%', background: '#10b981' }}></div>
              </div>
              <div className="pie-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#3b82f6' }}></span>
                  <span>Workers ({analyticsData.userDistribution?.workers || stats.totalWorkers})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#10b981' }}></span>
                  <span>Employers ({analyticsData.userDistribution?.employers || stats.totalEmployers})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs by Category Chart */}
        <div className="analytics-card chart-card">
          <h3>📋 Jobs by Category</h3>
          <div className="chart-container">
            <div className="bar-chart-placeholder">
              <div className="bar-chart">
                {Object.entries(analyticsData.jobStats?.byCategory || {}).map(([category, count]) => (
                  <div key={category} className="bar-item">
                    <span className="bar-label">{category}</span>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min((count / 500) * 100, 100)}%`,
                          background: '#3b82f6'
                        }}
                      ></div>
                    </div>
                    <span className="bar-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Location-wise Worker Demand */}
        <div className="analytics-card location-card">
          <h3>📍 Location-wise Worker Demand</h3>
          <div className="location-grid">
            {Object.entries(analyticsData.locationDemand || {}).map(([location, demand]) => {
              const demandLevel = demand > 1000 ? 'high' : demand > 500 ? 'medium' : 'low';
              return (
                <div key={location} className="location-item">
                  <span className="location-name">{location}</span>
                  <span className={`location-demand ${demandLevel}`}>{demand} workers</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Growth Chart */}
        <div className="analytics-card growth-card">
          <h3>📈 Platform Growth</h3>
          <div className="chart-container">
            <div className="line-chart-placeholder">
              <div className="line-chart">
                <div className="chart-header">
                  <span className="chart-title">User Registration Trend</span>
                  <div className="chart-period">Last 30 Days</div>
                </div>
                <div className="chart-content">
                  <div className="chart-grid">
                    {[...Array(30)].map((_, index) => (
                      <div key={index} className="chart-point" style={{ height: `${Math.random() * 80 + 20}px` }}>
                        <div className="chart-value">{Math.floor(Math.random() * 50 + 10)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div className="admin-dashboard">
      {renderSidebar()}
      <div className="admin-main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading admin dashboard...</p>
          </div>
        ) : (
          <>
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'users' && renderUserManagement()}
            {activeSection === 'verification' && renderWorkerVerification()}
            {activeSection === 'jobs' && renderJobManagement()}
            {activeSection === 'complaints' && renderReportsAndComplaints()}
            {activeSection === 'analytics' && renderAnalyticsAndInsights()}
          </>
        )}
      </div>
    </div>
  );
};
export default AdminDashboard;
