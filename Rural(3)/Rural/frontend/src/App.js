import React, { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import WorkerDashboard from './pages/WorkerDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import JobDetails from './pages/JobDetails';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PostJob from './pages/PostJob';
import BrowseWorkers from './pages/BrowseWorkers';
import socket from './utils/socket';
import AIChatbot from './components/AIChatbot';
import ChatModal from './components/ChatModal';
import { useState } from 'react';

const AppContent = () => {
  const { user } = useContext(AuthContext);
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    if (user) {
      console.log(' Attempting to connect socket for user:', user.id);
      socket.connect();
      socket.emit('join', user.id);

      socket.on('job-match', (data) => {
        alert(`New Job Match: ${data.jobTitle} (${data.matchPercentage}%)`);
      });

      socket.on('job-assigned', (data) => {
        alert(`Good news! You've been hired for: ${data.jobTitle}`);
      });

      socket.on('new-application', (data) => {
        alert(`New application received for: ${data.jobTitle}`);
      });

      socket.on('newMessage', (data) => {
        // Handle new message notifications
        console.log('New message received:', data);
      });

      // Listen for custom event to open chat modal
      const handleOpenChatModal = (event) => {
        setShowChatModal(true);
      };
      
      window.addEventListener('openChatModal', handleOpenChatModal);

      return () => {
        window.removeEventListener('openChatModal', handleOpenChatModal);
        socket.disconnect();
      };
    }
  }, [user]);

  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
            path="/worker/dashboard"
            element={
              <PrivateRoute role="worker">
                <WorkerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/employer/dashboard"
            element={
              <PrivateRoute role="employer">
                <EmployerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/post-job"
            element={
              <PrivateRoute role="employer">
                <PostJob />
              </PrivateRoute>
            }
          />
          <Route
            path="/browse-workers"
            element={
              <PrivateRoute role="employer">
                <BrowseWorkers />
              </PrivateRoute>
            }
          />
          <Route
            path="/job/:id"
            element={
              <PrivateRoute>
                <JobDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AIChatbot />
        <button className="global-chat-btn" onClick={() => setShowChatModal(true)}>
          💬 Messages
        </button>
        {showChatModal && (
          <ChatModal
            isOpen={showChatModal}
            onClose={() => setShowChatModal(false)}
          />
        )}
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;