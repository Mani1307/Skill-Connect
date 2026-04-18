import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import NearbyWorkersModal from '../components/NearbyWorkersModal';
import ServiceEstimatorModal from '../components/ServiceEstimatorModal';
import JobLocationMap from '../components/JobLocationMap';
import AIChat from '../components/AIChat';
import ChatModal from '../components/ChatModal';
import '../components/BookingNotifications.css';
import './Dashboard.css';

const EmployerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [topWorkers, setTopWorkers] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [profileSettings, setProfileSettings] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
    notifications: true,
    emailUpdates: true
  });
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [employerProfile, setEmployerProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    phone: '',
    companyName: '',
    address: '',
    about: ''
  });

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/employers/dashboard');
      setStats(response.data.stats);
      setRecentJobs(response.data.recentJobs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'painting', label: 'Painting', icon: '🎨', color: '#3B82F6' },
    { id: 'electrical', label: 'Electrical', icon: '⚡', color: '#F59E0B' },
    { id: 'masonry', label: 'Masonry', icon: '🧱', color: '#EF4444' },
    { id: 'plumbing', label: 'Plumbing', icon: '🚰', color: '#10B981' },
    { id: 'carpentry', label: 'Carpentry', icon: '🪚', color: '#8B5CF6' },
    { id: 'welding', label: 'Welding', icon: '🔥', color: '#F97316' },
    { id: 'construction', label: 'Construction', icon: '🏗️', color: '#6B7280' },
    { id: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#EC4899' },
    { id: 'gardening', label: 'Gardening', icon: '🌱', color: '#10B981' },
    { id: 'loading', label: 'Loading', icon: '📦', color: '#8B5CF6' },
    { id: 'fabrication', label: 'Fabrication', icon: '🛠️', color: '#06B6D4' },
    { id: 'tiling', label: 'Tiling', icon: '📐', color: '#DC2626' }
  ];

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
      fetchAdditionalData();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchEmployerProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCategoryClick = (category) => {
    // Navigate to PostJob page with the selected category pre-filled
    navigate('/post-job', { 
      state: { 
        selectedCategory: category.id,
        categoryName: category.label
      } 
    });
  };

  const handleProfileChange = (field, value) => {
    setProfileSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationClick = (notification) => {
    // Mark notification as read
    setNotifications(prev => 
      prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
    );

    // If it's a booking acceptance, open chat
    if (notification.type === 'booking_accepted' && notification.conversationId) {
      sessionStorage.setItem('pendingChat', JSON.stringify({
        conversationId: notification.conversationId,
        receiver: notification.worker
      }));
      setIsChatModalOpen(true);
    }
  };

  const saveProfileSettings = async () => {
    try {
      // Here you would typically make an API call to save settings
      console.log('Saving profile settings:', profileSettings);
      alert('✅ Profile settings saved successfully!');
    } catch (error) {
      console.error('Error saving profile settings:', error);
      alert('❌ Failed to save profile settings');
    }
  };

  const fetchEmployerProfile = async () => {
    try {
      const response = await api.get('/employers/profile');
      if (response.data.success) {
        setEmployerProfile(response.data.employer);
        setProfileFormData({
          phone: response.data.employer.phone || '',
          companyName: response.data.employer.companyName || '',
          address: response.data.employer.address || '',
          about: response.data.employer.about || ''
        });
      }
    } catch (error) {
      console.error('Error fetching employer profile:', error);
    }
  };

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/employers/profile', profileFormData);
      if (response.data.success) {
        alert('✅ Profile updated successfully!');
        setIsEditing(false);
        fetchEmployerProfile(); // Refresh profile data
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || 'Failed to update profile'));
    }
  };

  const fetchAdditionalData = async () => {
    try {
      // Fetch notifications
      try {
        const notificationsResponse = await api.get('/chat/notifications');
        setNotifications(notificationsResponse.data.notifications || []);
      } catch (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        setNotifications([]);
      }

      // Fetch booking acceptance notifications
      try {
        const bookingResponse = await api.get('/employers/booking-notifications');
        if (bookingResponse.data.success) {
          const bookingNotifications = bookingResponse.data.notifications.map(notif => ({
            ...notif,
            icon: notif.type === 'booking_accepted' ? '✅' : '❌',
            type: notif.type
          }));
          setNotifications(prev => [...bookingNotifications, ...prev]);
        }
      } catch (bookingError) {
        console.error('Error fetching booking notifications:', bookingError);
      }

      // Fetch top workers
      try {
        const topWorkersResponse = await api.get('/workers/top-rated');
        setTopWorkers(topWorkersResponse.data.workers || []);
      } catch (workersError) {
        console.error('Error fetching top workers:', workersError);
        setTopWorkers([]);
      }

      // Fetch active jobs
      try {
        const activeJobsResponse = await api.get('/employers/active-jobs');
        setActiveJobs(activeJobsResponse.data.jobs || []);
      } catch (jobsError) {
        console.error('Error fetching active jobs:', jobsError);
        setActiveJobs([]);
      }

      // Fetch upcoming payments
      try {
        const paymentsResponse = await api.get('/payments/upcoming');
        setUpcomingPayments(paymentsResponse.data.payments || []);
      } catch (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        setUpcomingPayments([]);
      }
    } catch (error) {
      console.error('General error in fetchAdditionalData:', error);
    }
  };

  const activeCategory = categories.find(cat => cat.id === selectedCategory);

  // Safe translation helper
  const safeT = (key, fallback) => {
    const result = t(key);
    return typeof result === 'string' ? result : fallback;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="tab-content-area dashboard-view">
            {/* Welcome Banner */}
            <div className="welcome-banner">
              <h1>Welcome back, {user?.name || 'Employer'}!</h1>
              <p>{safeT('employer.manageWorkforce', 'Manage your workforce efficiently')}</p>
              <div className="header-actions" style={{ marginTop: '2rem' }}>
                <button 
                  className="post-job-btn" 
                  onClick={() => navigate('/post-job')}
                >
                  {safeT('employer.postJob', 'Post New Job')}
                </button>
              </div>
            </div>

            {/* Modern Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <h3>{safeT('employer.stats.jobsPosted', 'Jobs Posted')}</h3>
                  <p className="stat-value">{stats?.totalJobsPosted || 0}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💼</div>
                <div className="stat-info">
                  <h3>{safeT('employer.stats.activeJobs', 'Active Jobs')}</h3>
                  <p className="stat-value">{stats?.activeJobs || 0}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>{safeT('employer.stats.pendingApplicants', 'Pending Applicants')}</h3>
                  <p className="stat-value">{stats?.pendingApplications || 0}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💳</div>
                <div className="stat-info">
                  <h3>{safeT('employer.stats.totalSpent', 'Total Spent')}</h3>
                  <p className="stat-value">₹{(stats?.totalSpent || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="service-quick-links">
              <h3>{t('employer.hire.title')}</h3>
              <div className="quick-links-grid">
                {categories.map(category => (
                  <div key={category.id} className="quick-link-card" onClick={() => handleCategoryClick(category)}>
                    <span className="q-icon">{category.icon}</span>
                    <span className="q-label">{category.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Sections */}
            <div className="dashboard-sections">
              {/* Left Column */}
              <div className="section-column">
                <div className="active-jobs-card">
                  <div className="card-header">
                    <h3>{t('employer.projects.active')}</h3>
                    <Link to="/my-jobs" className="view-all-btn">{t('employer.projects.viewAll')}</Link>
                  </div>
                  <div className="jobs-list">
                    {activeJobs.length > 0 ? (
                      activeJobs.slice(0, 3).map(job => (
                        <div key={job._id} className="worker-item">
                          <div className="worker-info" style={{ flex: 1 }}>
                            <h4>{job.title}</h4>
                            <div className="worker-rating">
                              <span className="status-badge active">{job.status}</span>
                            </div>
                          </div>
                          <div className="job-action">
                            <Link to={`/job/${job._id}`} className="view-btn">{t('common.viewDetails')}</Link>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-activity">{t('employer.projects.noActive')}</div>
                    )}
                  </div>
                </div>

                <div className="activity-card">
                  <div className="card-header">
                    <h3>{t('employer.activity.title')}</h3>
                  </div>
                  <div className="activity-list">
                    {recentJobs.length > 0 ? (
                      recentJobs.slice(0, 5).map((job, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-icon">📝</div>
                          <div className="activity-content">
                            <p>Posted new job: <strong>{job.title}</strong></p>
                            <span className="activity-time">{new Date(job.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-activity">{t('employer.activity.empty')}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="section-column">
                <div className="top-workers-card">
                  <div className="card-header">
                    <h3>{t('employer.workers.topRated')}</h3>
                  </div>
                  <div className="workers-list">
                    {topWorkers.length > 0 ? (
                      topWorkers.slice(0, 4).map((worker, index) => (
                        <div key={index} className="worker-item">
                          <div className="worker-avatar">
                            {worker.name?.charAt(0)}
                          </div>
                          <div className="worker-info">
                            <h4>{worker.name}</h4>
                            <div className="worker-rating">
                              <span className="stars">⭐ {worker.rating?.average || 5.0}</span>
                              <span className="reviews">({worker.rating?.count || 0} reviews)</span>
                            </div>
                            <div className="worker-details">
                              <p><strong>📞 Phone:</strong> {worker.phone || 'Not provided'}</p>
                              <p><strong>🏠 Address:</strong> {worker.location?.address || 'Not provided'}</p>
                              <p><strong>💼 Experience:</strong> {worker.experience?.years || 0} years</p>
                              <p><strong>🛠️ Skills:</strong> {worker.skills?.join(', ') || 'Not specified'}</p>
                              <p><strong>📝 Bio:</strong> {worker.bio || 'No bio available'}</p>
                            </div>
                            <div className="worker-actions">
                              <button className="contact-worker-btn">📞 Contact</button>
                              <button className="book-worker-btn">📅 Book Worker</button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-activity">{t('employer.workers.empty')}</div>
                    )}
                  </div>
                </div>

                <div className="payments-card">
                  <div className="card-header">
                    <h3>{t('employer.payments.upcoming')}</h3>
                  </div>
                  <div className="activity-list">
                    {upcomingPayments.length > 0 ? (
                      upcomingPayments.map((payment, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-icon">💰</div>
                          <div className="activity-content">
                            <p>Upcoming payment for <strong>{payment.workerName}</strong></p>
                            <span className="activity-time">₹{payment.amount} - {new Date(payment.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-activity">{t('employer.payments.empty')}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Help Banner */}
            <div className="ai-help-banner">
              <div className="ai-help-text">
                <h2>{t('employer.notifications.aiHelp')}</h2>
              </div>
              <button className="ai-help-btn" onClick={() => setIsAIChatOpen(true)}>
                <span>🤖</span> {t('employer.notifications.getAiHelp')}
              </button>
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="tab-content-area">
            <h2>{t('employer.history.title')}</h2>
            <p className="coming-soon">{t('employer.history.desc')}</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="tab-content-area notifications-section">
            <h2>{t('employer.sidebar.notifications')}</h2>
            <div className="notifications-container">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <div 
                    key={notification._id} 
                    className={`notification-card ${notification.read ? 'read' : 'unread'} ${notification.type === 'booking_accepted' ? 'booking-accepted' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="notification-header">
                      <span className="notification-type">
                        {notification.type === 'job_assigned' && '📋'}
                        {notification.type === 'job_accepted' && '✅'}
                        {notification.type === 'job_rejected' && '❌'}
                        {notification.type === 'application_received' && '📬'}
                        {notification.type === 'payment_received' && '💰'}
                        {notification.type === 'new_message' && '💬'}
                        {notification.type === 'booking_accepted' && '🎉'}
                        {notification.type === 'booking_rejected' && '❌'}
                        {notification.icon || '🔔'}
                      </span>
                      <span className="notification-time">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="notification-body">
                      <h4>
                        {notification.type === 'booking_accepted' ? '🎉 Booking Accepted!' : notification.title}
                      </h4>
                      <p>
                        {notification.type === 'booking_accepted' 
                          ? `${notification.workerName} accepted your booking request! Click to start chatting.`
                          : notification.message
                        }
                      </p>
                      {notification.jobId && (
                        <Link to={`/job/${notification.jobId}`} className="notification-link">
                          {t('common.viewDetails')}
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🔔</span>
                  <h3>{t('employer.notifications.empty')}</h3>
                  <p>{t('employer.notifications.emptyDesc')}</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="tab-content-area profile-section">
            <h2>{t('employer.sidebar.profile')}</h2>
            {employerProfile ? (
              <div className="profile-container">
                <div className="profile-header">
                  <div className="profile-avatar">
                    {employerProfile.name ? employerProfile.name.charAt(0).toUpperCase() : '👤'}
                  </div>
                  <div className="profile-info">
                    <h2>{employerProfile.name}</h2>
                    <p className="profile-role">🏢 {employerProfile.employerType || 'Employer'}</p>
                    <div className="profile-stats">
                      <div className="stat-item">
                        <span className="stat-label">Jobs Posted</span>
                        <span className="stat-value">{employerProfile.jobsPosted || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Spent</span>
                        <span className="stat-value">₹{(employerProfile.totalSpent || 0).toLocaleString()}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Rating</span>
                        <span className="stat-value">⭐ {employerProfile.rating?.average || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button className="edit-profile-btn" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
                  </button>
                </div>

                {isEditing ? (
                  <form className="profile-form" onSubmit={handleProfileSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>📞 Mobile Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileFormData.phone}
                          onChange={handleProfileFormChange}
                          placeholder="Enter your mobile number"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>🏢 Company Name</label>
                        <input
                          type="text"
                          name="companyName"
                          value={profileFormData.companyName}
                          onChange={handleProfileFormChange}
                          placeholder="Enter your company name"
                        />
                      </div>

                      <div className="form-group">
                        <label>🏠 Address</label>
                        <textarea
                          name="address"
                          value={profileFormData.address}
                          onChange={handleProfileFormChange}
                          placeholder="Enter your address"
                          rows="3"
                        />
                      </div>

                      <div className="form-group">
                        <label>📝 About</label>
                        <textarea
                          name="about"
                          value={profileFormData.about}
                          onChange={handleProfileFormChange}
                          placeholder="Tell us about your business..."
                          rows="4"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="save-profile-btn">
                        💾 Save Profile
                      </button>
                      <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
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
                          <span className="value">{employerProfile.email}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Phone:</span>
                          <span className="value">{employerProfile.phone || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h3>🏢 Business Information</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Employer Type:</span>
                          <span className="value">{employerProfile.employerType || 'Not specified'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Company Name:</span>
                          <span className="value">{employerProfile.companyName || 'Not provided'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Address:</span>
                          <span className="value">{employerProfile.address || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h3>📝 About</h3>
                      <div className="bio-content">
                        {employerProfile.about || 'No bio provided'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="loading-profile">
                <div className="profile-spinner"></div>
                <p>Loading profile...</p>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="tab-content-area settings-section">
            <h2>{t('employer.sidebar.settings')}</h2>
            <div className="settings-container">
              <div className="active-jobs-card" style={{ marginBottom: '2rem' }}>
                <h3>{t('employer.settings.account')}</h3>
                <div className="setting-item">
                  <label>{t('employer.settings.visibility')}</label>
                  <input type="checkbox" defaultChecked />
                </div>
                <div className="setting-item">
                  <label>{t('employer.settings.emailNotif')}</label>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>

              <div className="active-jobs-card">
                <h3>{t('employer.settings.help')}</h3>
                <div className="help-section" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="post-job-btn" onClick={() => setIsAIChatOpen(true)}>🤖 {t('employer.settings.chatAi')}</button>
                  <button className="view-btn">📧 {t('employer.settings.contactSupport')}</button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="employer-avatar">
            {user?.name?.charAt(0) || 'E'}
          </div>
          <h3>{user?.name || 'Employer'}</h3>
          <p>{t('employer.role', { defaultValue: 'Employer' })}</p>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span> {t('navbar.dashboard')}
          </button>
          <button
            className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <span className="nav-icon">🔔</span> {t('employer.sidebar.notifications')}
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="notification-badge">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="nav-icon">👤</span> {t('employer.sidebar.profile')}
          </button>
          <button
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="nav-icon">📜</span> {t('employer.sidebar.history')}
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-icon">⚙️</span> {t('employer.sidebar.settings')}
          </button>
          <button
            className="nav-item logout-btn"
            onClick={handleLogout}
          >
            <span className="nav-icon">🚪</span> {t('navbar.logout')}
          </button>
        </nav>
      </aside>

      <main className="dashboard-main">
        {loading && activeTab === 'dashboard' ? (
          <div className="loading">Loading...</div>
        ) : (
          renderContent()
        )}
      </main>

      <NearbyWorkersModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        isEmergency={isEmergency}
      />

      <ServiceEstimatorModal
        isOpen={isEstimatorOpen}
        onClose={() => setIsEstimatorOpen(false)}
        service={activeCategory}
      />

      <AIChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />

      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />
    </div>
  );
};
export default EmployerDashboard;
