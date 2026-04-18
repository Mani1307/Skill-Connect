const express = require('express');
const router = express.Router();
const { auth, isEmployer } = require('../middleware/auth');
const Job = require('../models/Job');

// @route   GET /api/payments/upcoming
// @desc    Get upcoming payments for employer
// @access  Private (Employer)
router.get('/upcoming', auth, isEmployer, async (req, res) => {
  try {
    // Mock upcoming payments data
    const upcomingPayments = [
      {
        _id: 1,
        jobTitle: 'Office Painting',
        workerName: 'Rajesh Kumar',
        amount: 25000,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'pending'
      },
      {
        _id: 2,
        jobTitle: 'Home Electrical Work',
        workerName: 'Vijay Singh',
        amount: 18000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'pending'
      },
      {
        _id: 3,
        jobTitle: 'Kitchen Plumbing',
        workerName: 'Amit Patel',
        amount: 12000,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: 'pending'
      }
    ];

    res.json({
      success: true,
      payments: upcomingPayments
    });
  } catch (error) {
    console.error('Get upcoming payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming payments',
      error: error.message
    });
  }
});

// @route   GET /api/payments/history
// @desc    Get payment history for employer
// @access  Private (Employer)
router.get('/history', auth, isEmployer, async (req, res) => {
  try {
    // Mock payment history data
    const paymentHistory = [
      {
        _id: 1,
        jobTitle: 'Building Construction',
        workerName: 'Sanjay Sharma',
        amount: 45000,
        paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        _id: 2,
        jobTitle: 'Wall Painting',
        workerName: 'Ramesh Gupta',
        amount: 15000,
        paidDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        _id: 3,
        jobTitle: 'Office Renovation',
        workerName: 'Arjun Reddy',
        amount: 32000,
        paidDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        status: 'completed'
      }
    ];

    res.json({
      success: true,
      payments: paymentHistory
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history',
      error: error.message
    });
  }
});

module.exports = router;