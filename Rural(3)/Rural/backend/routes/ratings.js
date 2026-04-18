const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Rating = require('../models/Rating');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Job = require('../models/Job');

// @route   POST /api/ratings
// @desc    Create a rating/review
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      jobId,
      ratedUserId,
      rating,
      categories,
      review,
      images,
      wouldRecommend
    } = req.body;

    // Verify job exists and user is part of it
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed jobs'
      });
    }

    // Verify user was part of the job
    const isEmployer = job.employer.toString() === req.user.id;
    const isWorker = job.assignedWorkers.some(
      w => w.worker.toString() === req.user.id
    );

    if (!isEmployer && !isWorker) {
      return res.status(403).json({
        success: false,
        message: 'You were not part of this job'
      });
    }

    // Check if already rated
    const existingRating = await Rating.findOne({
      job: jobId,
      ratedBy: req.user.id,
      ratedUser: ratedUserId
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this user for this job'
      });
    }

    // Create rating
    const newRating = new Rating({
      job: jobId,
      ratedBy: req.user.id,
      ratedUser: ratedUserId,
      raterRole: req.user.role,
      rating,
      categories,
      review,
      images,
      wouldRecommend
    });

    await newRating.save();

    // Update user's rating
    const allRatings = await Rating.find({ ratedUser: ratedUserId });
    const avgRating = allRatings.reduce((acc, r) => acc + r.rating, 0) / allRatings.length;

    if (req.user.role === 'employer') {
      // Employer rating a worker
      await Worker.findByIdAndUpdate(ratedUserId, {
        'rating.average': avgRating.toFixed(2),
        'rating.count': allRatings.length
      });
    } else {
      // Worker rating an employer
      await Employer.findByIdAndUpdate(ratedUserId, {
        'rating.average': avgRating.toFixed(2),
        'rating.count': allRatings.length
      });
    }

    // Send notification
    const io = req.app.get('io');
    io.to(ratedUserId).emit('new-rating', {
      rating: avgRating.toFixed(2),
      jobId: jobId
    });

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      rating: newRating
    });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting rating',
      error: error.message
    });
  }
});

// @route   GET /api/ratings/user/:userId
// @desc    Get ratings for a user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const ratings = await Rating.find({ ratedUser: req.params.userId })
      .populate('ratedBy', 'name')
      .populate('job', 'title category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Rating.countDocuments({ ratedUser: req.params.userId });

    // Calculate category averages
    const categoryAverages = {
      quality: 0,
      punctuality: 0,
      communication: 0,
      professionalism: 0,
      payment: 0
    };

    let categoryCount = 0;
    ratings.forEach(rating => {
      if (rating.categories) {
        Object.keys(categoryAverages).forEach(key => {
          if (rating.categories[key]) {
            categoryAverages[key] += rating.categories[key];
            categoryCount++;
          }
        });
      }
    });

    if (categoryCount > 0) {
      Object.keys(categoryAverages).forEach(key => {
        categoryAverages[key] = (categoryAverages[key] / ratings.length).toFixed(2);
      });
    }

    res.json({
      success: true,
      ratings,
      categoryAverages,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ratings',
      error: error.message
    });
  }
});

// @route   GET /api/ratings/job/:jobId
// @desc    Get ratings for a specific job
// @access  Private
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ job: req.params.jobId })
      .populate('ratedBy', 'name role')
      .populate('ratedUser', 'name role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      ratings
    });
  } catch (error) {
    console.error('Get job ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job ratings',
      error: error.message
    });
  }
});

// @route   GET /api/ratings/my-ratings
// @desc    Get ratings given by current user
// @access  Private
router.get('/my-ratings', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ ratedBy: req.user.id })
      .populate('ratedUser', 'name role')
      .populate('job', 'title category')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      ratings
    });
  } catch (error) {
    console.error('Get my ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your ratings',
      error: error.message
    });
  }
});

module.exports = router;
