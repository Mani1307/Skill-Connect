const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Job = require('../models/Job');

// Admin middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }
};

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Private (Admin)
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWorkers = await Worker.countDocuments();
    const totalEmployers = await Employer.countDocuments();
    const verifiedWorkers = await Worker.countDocuments({ 
      'identityProof.type': { $exists: true, $ne: null } 
    });
    const pendingApprovals = await Worker.countDocuments({ 
      verificationStatus: 'pending' 
    });
    const activeJobs = await Job.countDocuments({ status: 'active' });
    const flaggedJobs = await Job.countDocuments({ flagged: true });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalWorkers,
        totalEmployers,
        verifiedWorkers,
        pendingApprovals,
        activeJobs,
        flaggedJobs
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filtering
// @access  Private (Admin)
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    // Get all users with their discriminator data
    let users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean for better performance
    
    // Enrich users with their specific data
    for (let user of users) {
      if (user.role === 'worker') {
        try {
          const workerData = await Worker.findById(user._id)
            .select('skills experience years rating average count identityProof type documentType certificates');
          if (workerData) {
            user.skills = workerData.skills;
            user.experience = workerData.experience;
            user.rating = workerData.rating;
            user.identityProof = workerData.identityProof;
            user.certificates = workerData.certificates;
          }
        } catch (err) {
          console.error('Error fetching worker data:', err);
        }
      } else if (user.role === 'employer') {
        try {
          const employerData = await Employer.findById(user._id)
            .select('companyName employerType rating average count verificationStatus jobsPosted totalSpent');
          if (employerData) {
            user.companyName = employerData.companyName;
            user.employerType = employerData.employerType;
            user.rating = employerData.rating;
            user.verificationStatus = employerData.verificationStatus;
            user.jobsPosted = employerData.jobsPosted;
            user.totalSpent = employerData.totalSpent;
          }
        } catch (err) {
          console.error('Error fetching employer data:', err);
        }
      }
    }
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// @route   POST /api/admin/users/:id/:action
// @desc    Perform user actions (block, unblock, delete, approve, reject)
// @access  Private (Admin)
router.post('/users/:id/:action', auth, isAdmin, async (req, res) => {
  try {
    const { id, action } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    let updateData = {};
    let message = '';
    
    switch (action) {
      case 'block':
        updateData = { isActive: false };
        message = 'User blocked successfully';
        break;
      case 'unblock':
        updateData = { isActive: true };
        message = 'User unblocked successfully';
        break;
      case 'delete':
        await User.findByIdAndDelete(id);
        return res.json({
          success: true,
          message: 'User deleted successfully'
        });
      case 'approve':
        if (user.role === 'employer') {
          updateData = { verificationStatus: 'verified' };
          message = 'Employer approved successfully';
        } else {
          return res.status(400).json({
            success: false,
            message: 'Approval action only valid for employers'
          });
        }
        break;
      case 'reject':
        if (user.role === 'employer') {
          updateData = { verificationStatus: 'rejected' };
          message = 'Employer rejected successfully';
        } else {
          return res.status(400).json({
            success: false,
            message: 'Reject action only valid for employers'
          });
        }
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }
    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    
    res.json({
      success: true,
      message,
      user: updatedUser
    });
  } catch (error) {
    console.error('User action error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing user action',
      error: error.message
    });
  }
});

// @route   GET /api/admin/workers/verification
// @desc    Get workers for verification
// @access  Private (Admin)
router.get('/workers/verification', auth, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build query for workers only
    let query = { role: 'worker' };
    
    if (status && status !== 'all') {
      if (status === 'verified') {
        query['identityProof.type'] = { $exists: true, $ne: null };
      } else if (status === 'pending') {
        query['identityProof.type'] = { $exists: false };
      } else if (status === 'rejected') {
        query.verificationStatus = 'rejected';
      }
    }
    
    const skip = (page - 1) * limit;
    
    // Get workers with full details using Worker model
    const workers = await Worker.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await Worker.countDocuments(query);
    
    res.json({
      success: true,
      workers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get workers verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers for verification',
      error: error.message
    });
  }
});

// @route   POST /api/admin/workers/:id/verify
// @desc    Verify or reject worker
// @access  Private (Admin)
router.post('/workers/:id/verify', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    
    const worker = await Worker.findById(id);
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    let updateData = {};
    let message = '';
    
    switch (action) {
      case 'approve':
        // Worker is considered verified if they have identity proof
        if (!worker.identityProof || !worker.identityProof.type) {
          return res.status(400).json({
            success: false,
            message: 'Worker must upload identity proof first'
          });
        }
        updateData = { verificationStatus: 'verified' };
        message = 'Worker verified successfully';
        break;
      case 'reject':
        updateData = { 
          verificationStatus: 'rejected',
          rejectionReason: reason || 'Verification rejected'
        };
        message = 'Worker verification rejected';
        break;
      case 'revoke':
        updateData = { verificationStatus: 'pending' };
        message = 'Worker verification revoked';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }
    
    const updatedWorker = await Worker.findByIdAndUpdate(id, updateData, { new: true });
    
    res.json({
      success: true,
      message,
      worker: updatedWorker
    });
  } catch (error) {
    console.error('Worker verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying worker',
      error: error.message
    });
  }
});

// @route   GET /api/admin/jobs
// @desc    Get all jobs with filtering
// @access  Private (Admin)
router.get('/jobs', auth, isAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    // Get jobs with employer details
    const jobs = await Job.find(query)
      .populate('employer', 'name email companyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Job.countDocuments(query);
    
    res.json({
      success: true,
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
});

// @route   POST /api/admin/jobs/:id/:action
// @desc    Perform job actions (close, reopen, delete, flag, unflag)
// @access  Private (Admin)
router.post('/jobs/:id/:action', auth, isAdmin, async (req, res) => {
  try {
    const { id, action } = req.params;
    const { reason } = req.body;
    
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    let updateData = {};
    let message = '';
    
    switch (action) {
      case 'close':
        updateData = { status: 'closed' };
        message = 'Job closed successfully';
        break;
      case 'reopen':
        updateData = { status: 'active' };
        message = 'Job reopened successfully';
        break;
      case 'delete':
        await Job.findByIdAndDelete(id);
        return res.json({
          success: true,
          message: 'Job deleted successfully'
        });
      case 'flag':
        updateData = { 
          flagged: true,
          flagReason: reason || 'Flagged by admin'
        };
        message = 'Job flagged successfully';
        break;
      case 'unflag':
        updateData = { 
          flagged: false,
          flagReason: ''
        };
        message = 'Job unflagged successfully';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }
    
    const updatedJob = await Job.findByIdAndUpdate(id, updateData, { new: true });
    
    res.json({
      success: true,
      message,
      job: updatedJob
    });
  } catch (error) {
    console.error('Job action error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing job action',
      error: error.message
    });
  }
});

// @route   GET /api/admin/complaints
// @desc    Get all complaints and reports
// @access  Private (Admin)
router.get('/complaints', auth, isAdmin, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = {};
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    // Mock complaints data (replace with real database model)
    const complaints = [
      {
        _id: 'complaint1',
        type: 'worker',
        title: 'Employer didn\'t pay wages',
        description: 'I worked for 3 days but the employer refused to pay my daily wages of ₹800 per day.',
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
        description: 'The worker confirmed to come but never showed up on the job site.',
        complainant: { name: 'XYZ Builders', email: 'xyz@example.com' },
        target: { name: 'Suresh Singh', email: 'suresh@example.com' },
        status: 'investigating',
        priority: 'medium',
        createdAt: new Date('2024-01-14')
      },
      {
        _id: 'complaint3',
        type: 'payment',
        title: 'Payment dispute - incomplete work',
        description: 'Worker left job incomplete but demanding full payment.',
        complainant: { name: 'Home Owner', email: 'home@example.com' },
        target: { name: 'Painter Team', email: 'painter@example.com' },
        status: 'pending',
        priority: 'medium',
        createdAt: new Date('2024-01-13')
      },
      {
        _id: 'complaint4',
        type: 'fraud',
        title: 'Fake job posting',
        description: 'Employer posted fake job to collect worker information.',
        complainant: { name: 'Anonymous', email: 'anonymous@example.com' },
        target: { name: 'Fake Company', email: 'fake@example.com' },
        status: 'resolved',
        priority: 'high',
        createdAt: new Date('2024-01-12')
      }
    ];
    
    // Filter by type if specified
    const filteredComplaints = type && type !== 'all' 
      ? complaints.filter(c => c.type === type)
      : complaints;
    
    // Get total count for pagination
    const total = filteredComplaints.length;
    
    // Apply pagination
    const paginatedComplaints = filteredComplaints
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + parseInt(limit));
    
    res.json({
      success: true,
      complaints: paginatedComplaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching complaints',
      error: error.message
    });
  }
});

// @route   POST /api/admin/complaints/:id/:action
// @desc    Perform complaint actions
// @access  Private (Admin)
router.post('/complaints/:id/:action', auth, isAdmin, async (req, res) => {
  try {
    const { id, action } = req.params;
    
    let message = '';
    
    switch (action) {
      case 'investigate':
        message = 'Complaint marked for investigation';
        break;
      case 'warn':
        message = 'Warning sent to user';
        break;
      case 'resolve':
        message = 'Complaint resolved successfully';
        break;
      case 'suspend':
        message = 'User account suspended';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Complaint action error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing complaint action',
      error: error.message
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get analytics and insights data
// @access  Private (Admin)
router.get('/analytics', auth, isAdmin, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range based on period
    let days = 30;
    if (period === '7days') days = 7;
    if (period === '90days') days = 90;
    if (period === '1year') days = 365;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get analytics data
    const analytics = {
      userGrowth: await getUserGrowthData(startDate),
      jobStats: await getJobStats(),
      locationDemand: await getLocationDemand(),
      userDistribution: await getUserDistribution(),
      platformMetrics: await getPlatformMetrics(startDate)
    };
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

// Helper functions for analytics
async function getUserGrowthData(startDate) {
  // Mock data - replace with real database queries
  const data = [];
  for (let i = 0; i < 30; i++) {
    data.push({
      date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
      users: Math.floor(Math.random() * 50) + 10,
      workers: Math.floor(Math.random() * 30) + 5,
      employers: Math.floor(Math.random() * 20) + 5
    });
  }
  return data;
}

async function getJobStats() {
  // Mock data - replace with real database queries
  return {
    byCategory: {
      'Construction': 450,
      'Plumbing': 360,
      'Electrical': 270,
      'Painting': 480,
      'Carpentry': 320,
      'Cleaning': 290,
      'Gardening': 180,
      'Loading': 220
    },
    byStatus: {
      'active': 1250,
      'closed': 890,
      'flagged': 45
    }
  };
}

async function getLocationDemand() {
  // Mock data - replace with real database queries
  return {
    'Mumbai': 1234,
    'Delhi': 987,
    'Bangalore': 756,
    'Pune': 543,
    'Chennai': 321,
    'Hyderabad': 289,
    'Kolkata': 267,
    'Ahmedabad': 234
  };
}

async function getUserDistribution() {
  // Mock data - replace with real database queries
  return {
    'workers': 2340,
    'employers': 890,
    'admin': 5
  };
}

async function getPlatformMetrics(startDate) {
  // Mock data - replace with real database queries
  return {
    totalUsers: 3235,
    activeUsers: 2890,
    jobsCompleted: 1567,
    dailyGrowth: 12.5,
    revenue: 456789,
    avgJobValue: 1250
  };
}

module.exports = router;
