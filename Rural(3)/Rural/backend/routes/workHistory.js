const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const WorkHistory = require('../models/WorkHistory');

// @route   GET /api/work-history
// @desc    Get work history (filtered by user role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    
    // Filter based on user role
    if (req.user.role === 'worker') {
      query.worker = req.user.id;
    } else {
      query.employer = req.user.id;
    }

    if (status) {
      query.status = status;
    }

    const workHistory = await WorkHistory.find(query)
      .populate('worker', 'name skills rating phone')
      .populate('employer', 'name phone')
      .populate('job', 'title category location')
      .sort({ startDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await WorkHistory.countDocuments(query);

    res.json({
      success: true,
      workHistory,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
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

// @route   GET /api/work-history/:id
// @desc    Get single work history entry
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const workHistory = await WorkHistory.findById(req.params.id)
      .populate('worker', 'name skills rating phone')
      .populate('employer', 'name phone')
      .populate('job', 'title category location description');

    if (!workHistory) {
      return res.status(404).json({
        success: false,
        message: 'Work history not found'
      });
    }

    // Check authorization
    if (
      workHistory.worker._id.toString() !== req.user.id &&
      workHistory.employer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this work history'
      });
    }

    res.json({
      success: true,
      workHistory
    });
  } catch (error) {
    console.error('Get work history detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching work history detail',
      error: error.message
    });
  }
});

// @route   PUT /api/work-history/:id/attendance
// @desc    Update attendance record
// @access  Private (Employer or Worker)
router.put('/:id/attendance', auth, async (req, res) => {
  try {
    const { date, checkIn, checkOut, hoursWorked } = req.body;

    const workHistory = await WorkHistory.findById(req.params.id);

    if (!workHistory) {
      return res.status(404).json({
        success: false,
        message: 'Work history not found'
      });
    }

    workHistory.attendanceRecords.push({
      date: date || new Date(),
      checkIn,
      checkOut,
      hoursWorked,
      verified: req.user.role === 'employer'
    });

    await workHistory.save();

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      workHistory
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance',
      error: error.message
    });
  }
});

// @route   PUT /api/work-history/:id/completion
// @desc    Update completion percentage
// @access  Private (Employer)
router.put('/:id/completion', auth, async (req, res) => {
  try {
    const { completionPercentage } = req.body;

    const workHistory = await WorkHistory.findById(req.params.id);

    if (!workHistory) {
      return res.status(404).json({
        success: false,
        message: 'Work history not found'
      });
    }

    if (workHistory.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the employer can update completion percentage'
      });
    }

    workHistory.completionPercentage = completionPercentage;

    if (completionPercentage === 100) {
      workHistory.status = 'completed';
      workHistory.endDate = new Date();
    }

    await workHistory.save();

    // Send notification to worker
    const io = req.app.get('io');
    io.to(workHistory.worker.toString()).emit('work-progress-update', {
      workHistoryId: workHistory._id,
      completionPercentage
    });

    res.json({
      success: true,
      message: 'Completion percentage updated',
      workHistory
    });
  } catch (error) {
    console.error('Update completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating completion',
      error: error.message
    });
  }
});

// @route   GET /api/work-history/analytics/worker/:workerId
// @desc    Get worker analytics
// @access  Public
router.get('/analytics/worker/:workerId', async (req, res) => {
  try {
    const workHistory = await WorkHistory.find({ 
      worker: req.params.workerId,
      status: 'completed'
    });

    const totalJobs = workHistory.length;
    const totalEarnings = workHistory.reduce(
      (acc, work) => acc + (work.earnings.actualAmount || 0), 
      0
    );

    // Category breakdown
    const categoryBreakdown = {};
    workHistory.forEach(work => {
      if (!categoryBreakdown[work.category]) {
        categoryBreakdown[work.category] = {
          count: 0,
          earnings: 0
        };
      }
      categoryBreakdown[work.category].count++;
      categoryBreakdown[work.category].earnings += work.earnings.actualAmount || 0;
    });

    // Role distribution
    const roleDistribution = {};
    workHistory.forEach(work => {
      roleDistribution[work.role] = (roleDistribution[work.role] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        totalJobs,
        totalEarnings,
        categoryBreakdown,
        roleDistribution,
        averageEarningsPerJob: totalJobs > 0 ? (totalEarnings / totalJobs).toFixed(2) : 0
      }
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

module.exports = router;
