const express = require('express');
const router = express.Router();
const { auth, isEmployer } = require('../middleware/auth');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// @route   GET /api/employers/profile
// @desc    Get employer profile
// @access  Private (Employer)
router.get('/profile', auth, isEmployer, async (req, res) => {
  try {
    const employer = await Employer.findById(req.user.id).select('-password');
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    res.json({
      success: true,
      employer
    });
  } catch (error) {
    console.error('Get employer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employer profile',
      error: error.message
    });
  }
});

// @route   PUT /api/employers/profile
// @desc    Update employer profile
// @access  Private (Employer)
router.put('/profile', auth, isEmployer, async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates.email;
    delete updates.phone;
    delete updates.rating;
    delete updates.jobsPosted;
    delete updates.totalSpent;

    const employer = await Employer.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      employer
    });
  } catch (error) {
    console.error('Update employer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employer profile',
      error: error.message
    });
  }
});

// @route   GET /api/employers/dashboard
// @desc    Get employer dashboard statistics
// @access  Private (Employer)
router.get('/dashboard', auth, isEmployer, async (req, res) => {
  try {
    const employer = await Employer.findById(req.user.id);
    
    const jobs = await Job.find({ employer: req.user.id });
    
    const stats = {
      totalJobsPosted: employer.jobsPosted,
      totalSpent: employer.totalSpent,
      rating: employer.rating,
      activeJobs: jobs.filter(j => ['open', 'assigned', 'in-progress'].includes(j.status)).length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      pendingApplications: jobs.reduce((acc, job) => {
        return acc + job.applications.filter(app => app.status === 'pending').length;
      }, 0)
    };

    res.json({
      success: true,
      stats,
      recentJobs: jobs.slice(0, 5)
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/employers/active-jobs
// @desc    Get employer active jobs
// @access  Private (Employer)
router.get('/active-jobs', auth, isEmployer, async (req, res) => {
  try {
    const jobs = await Job.find({ 
      employer: req.user.id,
      status: { $in: ['open', 'assigned', 'in-progress'] }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Get active jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active jobs',
      error: error.message
    });
  }
});

// @route   GET /api/employers/booking-notifications
// @desc    Get employer booking acceptance notifications
// @access  Private (Employer)
router.get('/booking-notifications', auth, async (req, res) => {
  try {
    // Get booking acceptance notifications for this employer
    const notifications = await Notification.find({ 
      recipient: req.user.id,
      type: { $in: ['booking_accepted', 'booking_rejected', 'job_accepted'] }
    })
    .populate('sender', 'name email')
    .populate('relatedConversation')
    .sort({ createdAt: -1 });

    // Get accepted bookings for this employer
    const acceptedBookings = await Booking.find({ 
      employer: req.user.id, 
      status: 'accepted' 
    })
    .populate('worker', 'name email')
    .populate('conversationId')
    .sort({ updatedAt: -1 });

    // Combine notifications and booking data
    const bookingNotifications = [
      ...notifications.map(notification => ({
        _id: notification._id,
        type: notification.type,
        workerId: notification.sender._id,
        workerName: notification.sender.name,
        conversationId: notification.relatedConversation?._id,
        message: notification.message,
        createdAt: notification.createdAt,
        read: notification.read,
        worker: notification.sender
      })),
      ...acceptedBookings.map(booking => ({
        _id: booking._id,
        type: 'booking_accepted',
        workerId: booking.worker._id,
        workerName: booking.worker.name,
        conversationId: booking.conversationId?._id,
        message: `${booking.worker.name} accepted your booking request!`,
        createdAt: booking.updatedAt,
        read: false,
        worker: booking.worker
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      notifications: bookingNotifications
    });
  } catch (error) {
    console.error('Get booking notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking notifications',
      error: error.message
    });
  }
});

module.exports = router;
