const express = require('express');
const router = express.Router();
const { auth, isWorker } = require('../middleware/auth');
const Worker = require('../models/Worker');
const Job = require('../models/Job');
const WorkHistory = require('../models/WorkHistory');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance.toFixed(1);
}



// @route   GET /api/workers/profile
// @desc    Get worker profile
// @access  Private (Worker)
router.get('/profile', auth, isWorker, async (req, res) => {
  try {
    const worker = await Worker.findById(req.user.id).select('-password');
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    res.json({
      success: true,
      worker
    });
  } catch (error) {
    console.error('Get worker profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker profile',
      error: error.message
    });
  }
});

// @route   PUT /api/workers/profile
// @desc    Update worker profile
// @access  Private (Worker)
router.put('/profile', auth, isWorker, async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates.email;
    delete updates.phone;
    delete updates.rating;
    delete updates.completedJobs;
    delete updates.totalEarnings;

    const worker = await Worker.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Update expert level based on new data
    worker.updateExpertLevel();
    await worker.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      worker
    });
  } catch (error) {
    console.error('Update worker profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating worker profile',
      error: error.message
    });
  }
});

// @route   GET /api/workers/available-jobs
// @desc    Get available jobs for worker based on skills and location
// @access  Private (Worker)
router.get('/available-jobs', auth, isWorker, async (req, res) => {
  try {
    const worker = await Worker.findById(req.user.id);
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const { page = 1, limit = 10, category, urgency } = req.query;

    // Build query
    const query = {
      status: 'open',
      requiredSkills: { $in: worker.skills }
    };

    if (category) {
      query.category = category;
    }

    if (urgency) {
      query.urgency = urgency;
    }

    // If worker has location, prioritize nearby jobs
    const jobs = await Job.find(query)
      .populate('employer', 'name phone location rating')
      .sort({ urgency: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Job.countDocuments(query);

    res.json({
      success: true,
      jobs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get available jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available jobs',
      error: error.message
    });
  }
});

// @route   POST /api/workers/apply/:jobId
// @desc    Apply for a job
// @access  Private (Worker)
router.post('/apply/:jobId', auth, isWorker, async (req, res) => {
  try {
    const { proposedRate, message } = req.body;
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }

    // Check if already applied
    const alreadyApplied = job.applications.some(
      app => app.worker.toString() === req.user.id
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    job.applications.push({
      worker: req.user.id,
      proposedRate,
      message,
      status: 'pending'
    });

    await job.save();

    // Send notification to employer (via socket.io)
    const io = req.app.get('io');
    io.to(job.employer.toString()).emit('new-application', {
      jobId: job._id,
      jobTitle: job.title,
      workerId: req.user.id
    });

    res.json({
      success: true,
      message: 'Application submitted successfully',
      job
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying for job',
      error: error.message
    });
  }
});

// @route   GET /api/workers/my-jobs
// @desc    Get worker's assigned and ongoing jobs
// @access  Private (Worker)
router.get('/my-jobs', auth, isWorker, async (req, res) => {
  try {
    const { status } = req.query;

    const query = {
      'assignedWorkers.worker': req.user.id
    };

    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .populate('employer', 'name phone location rating')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your jobs',
      error: error.message
    });
  }
});

// @route   GET /api/workers/work-history
// @desc    Get worker's work history
// @access  Private (Worker)
router.get('/work-history', auth, isWorker, async (req, res) => {
  try {
    const workHistory = await WorkHistory.find({ worker: req.user.id })
      .populate('job', 'title category')
      .populate('employer', 'name rating')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      workHistory
    });
  } catch (error) {
    console.error('Get work history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching work history',
      error: error.message
    });
  }
});

// @route   GET /api/workers/earnings
// @desc    Get worker's earnings summary
// @access  Private (Worker)
router.get('/earnings', auth, isWorker, async (req, res) => {
  try {
    const worker = await Worker.findById(req.user.id);
    
    const workHistory = await WorkHistory.find({ 
      worker: req.user.id,
      status: 'completed'
    });

    const monthlyEarnings = {};
    workHistory.forEach(work => {
      const month = new Date(work.endDate || work.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthlyEarnings[month]) {
        monthlyEarnings[month] = 0;
      }
      monthlyEarnings[month] += work.earnings.agreedAmount || work.earnings.actualAmount || 0;
    });

    let pendingPaymentAmount = 0;
    const pendingPayments = await WorkHistory.find({
      worker: req.user.id,
      'earnings.paymentStatus': 'pending'
    });
    pendingPayments.forEach(work => {
      pendingPaymentAmount += work.earnings.agreedAmount || 0;
    });

    res.json({
      success: true,
      earnings: {
        total: worker.totalEarnings || 0,
        completedJobs: worker.completedJobs || 0,
        monthlyBreakdown: monthlyEarnings,
        pendingPayments: pendingPaymentAmount
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching earnings',
      error: error.message
    });
  }
});

// @route   PUT /api/workers/availability
// @desc    Update worker availability status
// @access  Private (Worker)
router.put('/availability', auth, isWorker, async (req, res) => {
  try {
    const { status, preferredWorkDays } = req.body;

    const worker = await Worker.findById(req.user.id);
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    if (status) {
      worker.availability.status = status;
    }

    if (preferredWorkDays) {
      worker.availability.preferredWorkDays = preferredWorkDays;
    }

    await worker.save();

    res.json({
      success: true,
      message: 'Availability updated successfully',
      availability: worker.availability
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating availability',
      error: error.message
    });
  }
});

// @route   GET /api/workers/top-rated
// @desc    Get top-rated workers
// @access  Public
router.get('/top-rated', async (req, res) => {
  try {
    const workers = await Worker.find({
      'rating.average': { $gte: 4.0 },
      'availability.status': 'available'
    })
      .select('-password -bankDetails')
      .sort({ 'rating.average': -1, 'rating.count': -1 })
      .limit(10);

    res.json({
      success: true,
      workers
    });
  } catch (error) {
    console.error('Get top rated workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top rated workers',
      error: error.message
    });
  }
});

// @route   GET /api/workers/analytics
// @desc    Get worker analytics for dashboard
// @access  Private (Worker)
router.get('/analytics', auth, isWorker, async (req, res) => {
  try {
    const workerId = req.user.id;
    const { period = '7days' } = req.query;

    // Determine date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    if (period === '7days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90days') {
      startDate.setDate(startDate.getDate() - 90);
    }

    // Get work history records for the period
    const workHistory = await WorkHistory.find({
      worker: workerId,
      startDate: { $gte: startDate, $lte: endDate }
    }).populate('job', 'title category');

    // Get completed work history for earnings
    const completedWorkHistory = await WorkHistory.find({
      worker: workerId,
      status: 'completed',
      endDate: { $gte: startDate, $lte: endDate }
    }).populate('job', 'title category');

    // Generate daily analytics data
    const dailyData = [];
    const daysCount = period === '7days' ? 7 : period === '30days' ? 30 : 90;
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Format date for comparison
      const dateStr = date.toISOString().split('T')[0];
      
      // Find work records for this date
      const dailyWork = workHistory.filter(work => {
        const workDate = new Date(work.startDate);
        const workDateStr = workDate.toISOString().split('T')[0];
        return workDateStr === dateStr;
      });
      
      // Calculate hours worked for this day
      let totalHours = 0;
      let totalIncome = 0;
      
      dailyWork.forEach(work => {
        // Calculate hours from attendance records
        work.attendanceRecords.forEach(record => {
          if (record.checkIn && record.checkOut) {
            const checkInTime = new Date(record.checkIn).getTime();
            const checkOutTime = new Date(record.checkOut).getTime();
            const hours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
            totalHours += hours;
          }
          
          // Add income if available
          if (record.hoursWorked) {
            totalIncome += (record.hoursWorked * work.hourlyRate) || 0;
          }
        });
        
        // Also add from earnings if available
        if (work.earnings) {
          totalIncome += work.earnings.actualAmount || work.earnings.agreedAmount || 0;
        }
      });
      
      // Calculate capacity as percentage of max possible hours (12 hours per day)
      const capacity = Math.min(100, Math.round((totalHours / 12) * 100));
      
      dailyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
        income: Math.round(totalIncome),
        capacity
      });
    }

    // Get monthly income data (last 6 months)
    const monthlyIncome = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthlyWork = await WorkHistory.find({
        worker: workerId,
        endDate: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'completed'
      });
      
      const monthlyTotal = monthlyWork.reduce((sum, work) => {
        return sum + (work.earnings?.actualAmount || work.earnings?.agreedAmount || 0);
      }, 0);
      
      monthlyIncome.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: monthlyTotal
      });
    }

    // Prepare response
    const analytics = {
      dailyHours: dailyData.map(item => ({ date: item.date, hours: item.hours })),
      dailyIncome: dailyData.map(item => ({ date: item.date, income: item.income })),
      workCapacity: dailyData.map(item => ({ date: item.date, capacity: item.capacity })),
      monthlyIncome,
      summary: {
        totalHoursWorked: dailyData.reduce((sum, day) => sum + day.hours, 0),
        totalIncomeEarned: dailyData.reduce((sum, day) => sum + day.income, 0),
        averageDailyHours: dailyData.length > 0 ? 
          Math.round((dailyData.reduce((sum, day) => sum + day.hours, 0) / dailyData.length) * 10) / 10 : 0,
        averageDailyIncome: dailyData.length > 0 ? 
          Math.round(dailyData.reduce((sum, day) => sum + day.income, 0) / dailyData.length) : 0
      }
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get worker analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker analytics',
      error: error.message
    });
  }
});

// @route   GET /api/workers/search
// @desc    Search for workers (public for employers)
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { skills, city, expertLevel, minRating, latitude, longitude, radius = 15, page = 1, limit = 10 } = req.query;
    const locationService = require('../utils/locationService');

    const query = {
      'availability.status': 'available'
    };

    if (skills) {
      const skillsArray = skills.split(',');
      query.skills = { $in: skillsArray };
    }

    if (city && !latitude) {
      query['location.city'] = new RegExp(city, 'i');
    }

    if (expertLevel) {
      query.expertLevel = expertLevel;
    }

    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    let workers = await Worker.find(query)
      .select('-password -bankDetails')
      .lean();

    // If coordinates are provided, filter and sort by distance
    if (latitude && longitude) {
      const center = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
      workers = workers.map(worker => {
        if (worker.location && worker.location.coordinates) {
          const distance = locationService.calculateDistance(
            center.latitude,
            center.longitude,
            worker.location.coordinates.latitude,
            worker.location.coordinates.longitude
          );
          return { ...worker, distance: parseFloat(distance.toFixed(2)) };
        }
        return { ...worker, distance: Infinity };
      })
      .filter(worker => worker.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);
    } else {
      workers = workers.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    }

    // Pagination
    const total = workers.length;
    const paginatedWorkers = workers.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      workers: paginatedWorkers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total: total
    });
  } catch (error) {
    console.error('Search workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching workers',
      error: error.message
    });
  }
});

// @route   GET /api/workers/notifications
// @desc    Get worker notifications (booking requests)
// @access  Private (Worker)
router.get('/notifications', auth, isWorker, async (req, res) => {
  try {
    console.log('🔍 Worker notifications endpoint called by user:', req.user);
    
    // Get booking requests for this worker
    const bookings = await Booking.find({ 
      worker: req.user.id, 
      status: 'pending' 
    })
    .populate('employer', 'name email')
    .sort({ createdAt: -1 });

    // Get other notifications for this worker
    const notifications = await Notification.find({ 
      recipient: req.user.id,
      type: { $in: ['booking_request', 'booking_accepted', 'booking_rejected', 'job_offer'] }
    })
    .populate('sender', 'name email')
    .sort({ createdAt: -1 });

    // Combine booking requests and notifications
    const combinedNotifications = [
      ...bookings.map(booking => {
        console.log('📋 Processing booking:', booking);
        return {
          _id: booking._id,
          type: 'booking_request',
          employerId: booking.employer._id,
          employerName: booking.employer.name,
          category: booking.category,
          isEmergency: booking.isEmergency,
          proposedRate: booking.proposedRate,
          message: booking.message,
          createdAt: booking.createdAt,
          read: false,
          bookingId: booking._id
        };
      }),
      ...notifications.map(notification => {
        console.log('📬 Processing notification:', notification);
        return {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt,
          read: notification.read,
          sender: notification.sender,
          conversationId: notification.relatedConversation
        };
      })
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log('📤 Final notifications array:', combinedNotifications);

    console.log('📤 Sending notifications:', combinedNotifications.length);
    res.json({
      success: true,
      notifications: combinedNotifications
    });
  } catch (error) {
    console.error('Get worker notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// @route   POST /api/workers/accept-booking
// @desc    Worker accepts a booking request
// @access  Private (Worker)
router.post('/accept-booking', auth, isWorker, async (req, res) => {
  try {
    const { bookingId, employerId } = req.body;
    
    console.log('🎯 Accept booking request:', {
      bookingId,
      employerId,
      userId: req.user.id,
      userRole: req.user.role
    });

    // Find and update the booking
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        status: 'accepted',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('employer worker');

    console.log('📋 Found booking:', booking);

    if (!booking) {
      console.log('❌ Booking not found for ID:', bookingId);
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Create a conversation for chat
    const conversation = new Conversation({
      participants: [
        req.user.id,
        employerId
      ],
      booking: bookingId
    });
    
    console.log('💬 Creating conversation:', {
      participants: [req.user.id, employerId],
      bookingId
    });
    
    await conversation.save();
    console.log('✅ Conversation created:', conversation._id);

    // Update booking with conversation ID
    booking.conversationId = conversation._id;
    await booking.save();

    // Create notification for employer
    const employerNotification = new Notification({
      recipient: employerId,
      sender: req.user.id,
      type: 'booking_accepted',
      title: 'Booking Accepted!',
      message: `${booking.worker.name} accepted your booking request!`,
      relatedConversation: conversation._id
    });
    await employerNotification.save();

    // Send real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(employerId.toString()).emit('newNotification', {
        notification: {
          _id: employerNotification._id,
          type: 'booking_accepted',
          workerId: req.user.id,
          workerName: booking.worker.name,
          conversationId: conversation._id,
          message: employerNotification.message,
          createdAt: employerNotification.createdAt,
          read: false,
          worker: booking.worker
        }
      });
    }

    // Get employer details for response
    const employer = await User.findById(employerId);

    res.json({
      success: true,
      conversationId: conversation._id,
      employer: {
        _id: employer._id,
        name: employer.name,
        role: 'employer'
      },
      message: 'Booking accepted successfully!'
    });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting booking',
      error: error.message
    });
  }
});

// @route   POST /api/workers/reject-booking
// @desc    Worker rejects a booking request
// @access  Private (Worker)
router.post('/reject-booking', auth, isWorker, async (req, res) => {
  try {
    const { bookingId, employerId } = req.body;

    // Find and update the booking
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        status: 'rejected',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Create notification for employer
    const employerNotification = new Notification({
      recipient: employerId,
      sender: req.user.id,
      type: 'booking_rejected',
      title: 'Booking Rejected',
      message: 'Your booking request was rejected.',
    });
    await employerNotification.save();

    res.json({
      success: true,
      message: 'Booking rejected successfully!'
    });
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting booking',
      error: error.message
    });
  }
});

module.exports = router;
