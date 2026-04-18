import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import WorkerNotifications from '../components/WorkerNotifications';
import ChatModal from '../components/ChatModal';
import WorkerProfile from '../components/WorkerProfile';
import './WorkerDashboard.css';

const translations = {
  english: {
    findWork: 'Find Work',
    discoverOpportunities: 'Discover opportunities and manage your ongoing projects.',
    availableJobs: 'Available Jobs',
    activeProjects: 'Active Projects',
    locationMap: 'Location Map',
    earningsSummary: 'Earnvings Summary',
    jobsCompleted: 'Jobs Completed',
    pendingPayments: 'Pending Payments',
    liveAvailability: 'Live Availability',
    shareLocation: 'Share location to get higher priority for nearby jobs.',
    enableTracking: 'Enable Tracking',
    trackingActive: 'Tracking Active',
    filterByCategory: 'Filter by Category',
    all: 'All Jobs',
    painting: 'Painting',
    electrical: 'Electrical',
    masonry: 'Masonry',
    plumbing: 'Plumbing',
    carpentry: 'Carpentry',
    welding: 'Welding',
    construction: 'Construction',
    cleaning: 'Cleaning',
    gardening: 'Gardening',
    loading: 'Loading',
    fabrication: 'Fabrication',
    tiling: 'Tiling',
    jobsFound: 'jobs found',
    jobsInProgress: 'jobs in progress',
    active: 'ACTIVE',
    duration: 'Duration:',
    estimatedPay: 'Estimated Pay:',
    category: 'Category:',
    postedBy: 'Posted by:',
    applyNow: 'Apply Now',
    applied: 'Applied',
    applying: 'Applying...',
    viewDetails: 'View Details',
    noJobsFound: 'No jobs found matching your skills right now.',
    checkBackLater: 'Check back later or explore other categories!',
    yourActiveJobs: 'Your Active Jobs',
    noActiveJobs: 'No active jobs right now',
    liveLocationTracking: 'Live Location Tracking',
    shareRealTimeLocation: 'Share your real-time location with employers',
    stopTracking: 'Stop Tracking',
    startTracking: 'Start Tracking',
    live: 'Live',
    paused: 'Paused',
    youAreHere: 'You are here!',
    trackingPaused: 'Tracking paused',
    professional: 'Professional',
    loadingDashboard: 'Loading dashboard...'
  },
  telugu: {
    findWork: 'పనిని కనుగొనండి',
    discoverOpportunities: 'అవకాశాలను కనుగొనండి మరియు మీ కొనసాగుతున్న ప్రాజెక్ట్‌లను నిర్వహించండి.',
    availableJobs: 'అందుబాటులో ఉన్న పనులు',
    activeProjects: 'నడుస్తున్న ప్రాజెక్ట్‌లు',
    locationMap: 'స్థాన మ్యాప్',
    earningsSummary: 'సంపాదన సారాంశం',
    jobsCompleted: 'పూర్తయిన పనులు',
    pendingPayments: 'పెండింగ్ చెల్లింపులు',
    liveAvailability: 'లైవ్ లభ్యత',
    shareLocation: 'సమీపంలోని పనుల కోసం అధిక ప్రాధాన్యత పొందడానికి స్థానాన్ని పంచుకోండి.',
    enableTracking: 'ట్రాకింగ్ ఆన్ చేయండి',
    trackingActive: 'ట్రాకింగ్ అవుతోంది',
    filterByCategory: 'వర్గం ద్వారా ఫిల్టర్ చేయండి',
    all: 'అన్ని పనులు',
    painting: 'పెయింటింగ్',
    electrical: 'ఎలక్ట్రికల్',
    masonry: 'మేస్త్రీ',
    plumbing: 'ప్లంబింగ్',
    carpentry: 'వడ్రంగి',
    welding: 'వెల్డింగ్',
    construction: 'నిర్మాణం',
    cleaning: 'శుభ్రపరచడం',
    gardening: 'తోటపని',
    loading: 'లోడింగ్',
    fabrication: 'ఫ్యాబ్రికేషన్',
    tiling: 'టైలింగ్',
    jobsFound: 'పనులు కనుగొనబడ్డాయి',
    jobsInProgress: 'పనులు జరుగుతున్నాయి',
    active: 'యాక్టివ్',
    duration: 'సమయం:',
    estimatedPay: 'అంచనా వేతనం:',
    category: 'వర్గం:',
    postedBy: 'పోస్ట్ చేసినవారు:',
    applyNow: 'దరఖాస్తు చేసుకోండి',
    applied: 'దరఖాస్తు చేసారు',
    applying: 'దరఖాస్తు చేస్తోంది...',
    viewDetails: 'వివరాలు చూడండి',
    noJobsFound: 'ప్రస్తుతం మీ నైపుణ్యాలకు తగిన పనులు లేవు.',
    checkBackLater: 'తర్వాత తనిఖీ చేయండి లేదా ఇతర వర్గాలను అన్వేషించండి!',
    yourActiveJobs: 'మీ యాక్టివ్ పనులు',
    noActiveJobs: 'ప్రస్తుతం యాక్టివ్ పనులు లేవు',
    liveLocationTracking: 'లైవ్ లొకేషన్ ట్రాకింగ్',
    shareRealTimeLocation: 'యజమానులతో మీ నిజ-సమయ స్థానాన్ని పంచుకోండి',
    stopTracking: 'ట్రాకింగ్ ఆపండి',
    startTracking: 'ట్రాకింగ్ ప్రారంభించండి',
    live: 'లైవ్',
    paused: 'పాజ్ చేయబడింది',
    youAreHere: 'మీరు ఇక్కడ ఉన్నారు!',
    trackingPaused: 'ట్రాకింగ్ ఆపబడింది',
    professional: 'ప్రొఫెషనల్',
    loadingDashboard: 'డాష్‌బోర్డ్ లోడ్ అవుతోంది...'
  },
  hindi: {
    findWork: 'काम खोजें',
    discoverOpportunities: 'अवसरों की खोज करें और अपनी चल रही परियोजनाओं का प्रबंधन करें।',
    availableJobs: 'उपलब्ध नौकरियां',
    activeProjects: 'सक्रिय परियोजनाएं',
    locationMap: 'स्थान मानचित्र',
    earningsSummary: 'कमाई का सारांश',
    jobsCompleted: 'पूरी की गई नौकरियां',
    pendingPayments: 'लंबित भुगतान',
    liveAvailability: 'लाइव उपलब्धता',
    shareLocation: 'आस-पास के कार्यों के लिए उच्च प्राथमिकता प्राप्त करने के लिए स्थान साझा करें।',
    enableTracking: 'ट्रैकिंग सक्षम करें',
    trackingActive: 'ट्रैकिंग सक्रिय है',
    filterByCategory: 'श्रेणी के अनुसार फ़िल्टर करें',
    all: 'सभी नौकरियां',
    painting: 'पेंटिंग',
    electrical: 'इलेक्ट्रिकल',
    masonry: 'चिनाई',
    plumbing: 'प्लंबिंग',
    carpentry: 'बढ़ईगिरी',
    welding: 'वेल्डिंग',
    construction: 'निर्माण',
    cleaning: 'सफाई',
    gardening: 'बागवानी',
    loading: 'लोडिंग',
    fabrication: 'निर्माण (Fabrication)',
    tiling: 'टाइलिंग',
    jobsFound: 'नौकरियां मिलीं',
    jobsInProgress: 'नौकरियां प्रगति पर हैं',
    active: 'सक्रिय',
    duration: 'अवधि:',
    estimatedPay: 'अनुमानित वेतन:',
    category: 'श्रेणी:',
    postedBy: 'द्वारा पोस्ट किया गया:',
    applyNow: 'अभी आवेदन करें',
    applied: 'आवेदन किया',
    applying: 'आवेदन कर रहा है...',
    viewDetails: 'विवरण देखें',
    noJobsFound: 'अभी आपके कौशल से मेल खाने वाली कोई नौकरी नहीं मिली।',
    checkBackLater: 'बाद में वापस जाँच करें या अन्य श्रेणियों का पता लगाएं!',
    yourActiveJobs: 'आपकी सक्रिय नौकरियां',
    noActiveJobs: 'अभी कोई सक्रिय नौकरी नहीं है',
    liveLocationTracking: 'लाइव लोकेशन ट्रैकिंग',
    shareRealTimeLocation: 'नियोक्ताओं के साथ अपना वास्तविक समय स्थान साझा करें',
    stopTracking: 'ट्रैकिंग बंद करें',
    startTracking: 'ट्रैकिंग शुरू करें',
    live: 'लाइव',
    paused: 'रुका हुआ',
    youAreHere: 'आप यहाँ हैं!',
    trackingPaused: 'ट्रैकिंग रोक दी गई है',
    professional: 'पेशेवर',
    loadingDashboard: 'डैशबोर्ड लोड हो रहा है...'
  }
};

const WorkerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [language, setLanguage] = useState('english');
  const t = translations[language];

  const [activeTab, setActiveTab] = useState('available');
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [notificationCount, setNotificationCount] = useState(0);

  const categories = [
    { id: 'all', label: 'All Jobs', icon: '📋' },
    { id: 'painting', label: 'Painting', icon: '🎨' },
    { id: 'electrical', label: 'Electrical', icon: '⚡' },
    { id: 'masonry', label: 'Masonry', icon: '🧱' },
    { id: 'plumbing', label: 'Plumbing', icon: '🚰' },
    { id: 'carpentry', label: 'Carpentry', icon: '🪚' },
    { id: 'welding', label: 'Welding', icon: '🔥' },
    { id: 'construction', label: 'Construction', icon: '🏗️' },
    { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
    { id: 'gardening', label: 'Gardening', icon: '🌱' },
    { id: 'loading', label: 'Loading', icon: '📦' },
    { id: 'fabrication', label: 'Fabrication', icon: '🛠️' },
    { id: 'tiling', label: 'Tiling', icon: '📐' }
  ];

  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [workerProfile, setWorkerProfile] = useState(null);

  const handleAcceptBooking = () => {
    setHasNewNotifications(false);
    setIsChatModalOpen(true);
  };

  const handleOpenChat = () => {
    setIsChatModalOpen(true);
  };

  const fetchWorkerProfile = async () => {
    try {
      const response = await api.get('/workers/profile');
      if (response.data.success) {
        setWorkerProfile(response.data.worker);
      }
    } catch (error) {
      console.error('Error fetching worker profile:', error);
    }
  };

  const handleApplyJob = async (jobId) => {
    try {
      setApplyingJobId(jobId);
      const response = await api.post(`/jobs/${jobId}/accept`, {
        proposedRate: undefined,
        message: 'Interested in this job'
      });

      if (response.data.success) {
        // Update applied jobs set
        setAppliedJobs(new Set([...appliedJobs, jobId]));
        alert('✅ Job application submitted successfully!');
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || 'Failed to apply for job'));
    } finally {
      setApplyingJobId(null);
    }
  };

  // Fix for default marker icon in React-Leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setLocationError(null);
      },
      (error) => {
        setLocationError('Unable to retrieve your location. Please enable location access.');
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );

    setWatchId(id);
  };

  const stopLocationTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const query = filter !== 'all' ? `?category=${filter}` : '';
        const [jobsRes, myJobsRes, earningsRes, notificationsRes] = await Promise.all([
          api.get(`/workers/available-jobs${query}`),
          api.get('/workers/my-jobs?status=assigned'),
          api.get('/workers/earnings'),
          api.get('/workers/notifications')
        ]);
        setJobs(jobsRes.data.jobs);
        setMyJobs(myJobsRes.data.jobs);
        setEarnings(earningsRes.data.earnings);
        setMonthlyEarnings(earningsRes.data.earnings?.monthlyBreakdown || {});
        console.log('🔔 Notifications response:', notificationsRes.data);
        setNotificationCount(notificationsRes.data.notifications?.length || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filter, activeTab]);

  useEffect(() => {
    fetchWorkerProfile();
  }, []);

  if (loading) return <div className="loading">{t.loadingDashboard}</div>;

  const renderContent = () => {
    switch (activeTab) {
      case 'location':
        return (
          <div className="tab-section">
            <div className="section-header">
              <h2>{t.liveLocationTracking}</h2>
              <p className="section-subtitle">{t.shareRealTimeLocation}</p>
            </div>

            <div className="location-controls">
              <button
                className={`location-btn ${isTracking ? 'stop' : 'start'}`}
                onClick={isTracking ? stopLocationTracking : startLocationTracking}
              >
                {isTracking ? `🛑 ${t.stopTracking}` : `🚀 ${t.startTracking}`}
              </button>
              {userLocation && (
                <div className="location-info">
                  <span className="location-coords">
                    📍 {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                  </span>
                  <span className="tracking-status">
                    {isTracking ? `🟢 ${t.live}` : `🔴 ${t.paused}`}
                  </span>
                </div>
              )}
            </div>

            {locationError && (
              <div className="location-error">
                ⚠️ {locationError}
              </div>
            )}

            <div className="map-container">
              {userLocation ? (
                <MapContainer
                  center={userLocation}
                  zoom={16}
                  style={{ height: '500px', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© OpenStreetMap contributors'
                  />
                  <Marker position={userLocation}>
                    <Popup>
                      {t.youAreHere} 📍<br />
                      {isTracking ? t.trackingActive : t.trackingPaused}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="map-placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">🗺️</div>
                    <h3>{t.startTracking}</h3>
                    <p>{t.shareRealTimeLocation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'active':
        return (
          <div className="tab-section">
            <div className="section-header">
              <h2>{t.yourActiveJobs}</h2>
              <p className="section-subtitle">{myJobs.length} {t.jobsInProgress}</p>
            </div>
            {myJobs.length > 0 ? (
              <div className="jobs-list">
                {myJobs.map(job => (
                  <div key={job._id} className="job-card active-job">
                    <div className="job-badge">{t.active}</div>
                    <div className="job-info">
                      <h3>{job.title}</h3>
                      <p className="job-category">{t.category} {t[job.category] || job.category}</p>
                      <p className="job-employer">👤 {job.employer?.name}</p>
                      <p className="job-location">📍 {job.location?.city}, {job.location?.district}</p>
                      <div className="job-meta">
                        <span>⏱️ {t.duration} {job.duration?.estimated} {job.duration?.unit}</span>
                      </div>
                    </div>
                    <div className="job-action">
                      <p className="job-price">₹{job.wageCalculation?.totalEstimated}</p>
                      <Link to={`/job/${job._id}`} className="view-btn">{t.viewDetails}</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{t.noActiveJobs}</p>
              </div>
            )}
          </div>
        );
      case 'available':
        return (
          <div className="tab-section">
            <div className="filter-section">
              <h3>{t.filterByCategory}</h3>
              <div className="filter-scroll">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`filter-btn ${filter === cat.id ? 'active' : ''}`}
                    onClick={() => setFilter(cat.id)}
                  >
                    {cat.icon} {t[cat.id] || cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="section-header">
              <h2>{t.availableJobs}</h2>
              <p className="section-subtitle">{jobs.length} {t.jobsFound}</p>
            </div>

            {jobs.length > 0 ? (
              <div className="jobs-list">
                {jobs.map(job => (
                  <div key={job._id} className="job-card available-job">
                    <div className="job-header">
                      <h3>{job.title}</h3>
                      <span className={`urgency-badge ${job.urgency}`}>🔴 {job.urgency.toUpperCase()}</span>
                    </div>
                    <p className="job-category">{t.category} {t[job.category] || job.category}</p>
                    <p className="job-employer">👤 {t.postedBy} {job.employer?.name}</p>
                    <p className="job-location">📍 {job.location?.city}, {job.location?.address}</p>
                    <div className="job-details">
                      <div className="detail-item">
                        <span className="label">⏱️ {t.duration}</span>
                        <span className="value">{job.duration?.estimated} {job.duration?.unit}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">💰 {t.estimatedPay}</span>
                        <span className="value price">₹{job.wageCalculation?.totalEstimated}</span>
                      </div>
                    </div>
                    <p className="job-description">{job.description?.substring(0, 100)}...</p>
                    <div className="job-action-buttons">
                      <button
                        className="apply-btn"
                        onClick={() => handleApplyJob(job._id)}
                        disabled={appliedJobs.has(job._id) || applyingJobId === job._id}
                      >
                        {appliedJobs.has(job._id) ? `✅ ${t.applied}` : (applyingJobId === job._id ? `⏳ ${t.applying}` : `📝 ${t.applyNow}`)}
                      </button>
                      <Link to={`/job/${job._id}`} className="view-btn-large">{t.viewDetails}</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{t.noJobsFound}</p>
                <p className="empty-hint">{t.checkBackLater}</p>
              </div>
            )}
          </div>
        );
      case 'notifications':
        console.log('📬 Rendering notifications tab...');
        return (
          <div className="tab-section">
            <WorkerNotifications onAcceptBooking={handleAcceptBooking} />
          </div>
        );
      case 'profile':
        console.log('👤 Rendering profile tab...');
        return (
          <div className="tab-section">
            <WorkerProfile profile={workerProfile} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="wd-dashboard-v2">
      {/* Left Sidebar Profile & Stats */}
      <aside className="wd-sidebar">
        <div className="wd-profile-card">
          <div className="wd-avatar">
            {user.name.charAt(0)}
            <div className={`wd-status-dot ${isTracking ? 'live' : 'idle'}`}></div>
          </div>
          <h2 className="wd-worker-name">{user.name}</h2>
          <p className="wd-expert-level">{user.expertLevel} {t.professional}</p>

          <div className="wd-skills-container">
            {user.skills?.map((skill, idx) => (
              <span key={idx} className="wd-skill-pill">{skill}</span>
            ))}
          </div>
        </div>

        <div className="wd-earnings-card">
          <h3 className="wd-card-title">{t.earningsSummary}</h3>
          <div className="wd-earning-main">
            <span className="wd-currency">₹</span>
            <span className="wd-amount">{earnings?.total || 0}</span>
          </div>

          <div className="wd-earning-details">
            <div className="wd-detail-row">
              <span>{t.jobsCompleted}</span>
              <strong>{earnings?.completedJobs || 0}</strong>
            </div>
            <div className="wd-detail-row">
              <span>{t.pendingPayments}</span>
              <strong>₹{earnings?.pendingPayments || 0}</strong>
            </div>
          </div>
        </div>

        <div className="wd-location-card">
          <h3 className="wd-card-title">{t.liveAvailability}</h3>
          <p className="wd-card-desc">{t.shareLocation}</p>
          <button
            className={`wd-btn-toggle ${isTracking ? 'active' : ''}`}
            onClick={isTracking ? stopLocationTracking : startLocationTracking}
          >
            {isTracking ? (
              <><span className="wd-pulse"></span> {t.trackingActive}</>
            ) : (
              <>📍 {t.enableTracking}</>
            )}
          </button>
          {locationError && <p className="wd-error-text">{locationError}</p>}
        </div>
      </aside>

      {/* Main Feed Content */}
      <main className="wd-main-feed">
        <div className="wd-feed-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{t.findWork}</h1>
            <p>{t.discoverOpportunities}</p>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="language-dropdown"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              outline: 'none',
              backgroundColor: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="english">English</option>
            <option value="telugu">తెలుగు</option>
            <option value="hindi">हिन्दी</option>
          </select>
        </div>

        <div className="wd-tabs-nav">
          <button
            className={`wd-tab ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            {t.availableJobs} ({jobs.length})
          </button>
          <button
            className={`wd-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            {t.activeProjects} ({myJobs.length})
          </button>
          <button
            className={`wd-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button
            className={`wd-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => {
              console.log('🔔 Clicking notifications tab...');
              setActiveTab('notifications');
            }}
          >
            📬 Notifications {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
          </button>
          <button
            className={`wd-tab ${activeTab === 'location' ? 'active' : ''}`}
            onClick={() => setActiveTab('location')}
          >
            {t.locationMap}
          </button>
        </div>

        <div className="wd-feed-content">
          {renderContent()}
        </div>
      </main>

      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />
    </div>
  );
};

export default WorkerDashboard;
