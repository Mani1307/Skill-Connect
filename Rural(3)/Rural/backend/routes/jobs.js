const express = require('express');
const router = express.Router();
const { auth, isEmployer } = require('../middleware/auth');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const WorkHistory = require('../models/WorkHistory');
const Employer = require('../models/Employer');
const Worker = require('../models/Worker');
const { sendEmail, emailTemplates } = require('../utils/emailService');
const User = require('../models/User');

// Wage calculation helper
const calculateWage = (jobData) => {
  const { jobType, workersNeeded, duration, wageCalculation } = jobData;
  
  // If ML wage calculation is provided, use it
  if (wageCalculation && wageCalculation.totalEstimated) {
    return wageCalculation;
  }
  
  // Base rates per day (in local currency) - updated for job types
  const baseRates = {
    Driver: 600,
    Painter: 600,
    Electrician: 800,
    Plumber: 750,
    Carpenter: 650,
    Mason: 700,
    Welder: 700,
    Cleaner: 400,
    Gardener: 450,
    Constructor: 600,
    Fabricator: 650,
    Tiler: 700,
    other: 500
  };

  const baseRate = baseRates[jobType] || 500;
  
  // Calculate duration in days
  let durationInDays = 1;
  if (duration.unit === 'hours') {
    durationInDays = duration.estimated / 8; // 8 hours = 1 day
  } else if (duration.unit === 'days') {
    durationInDays = duration.estimated;
  } else if (duration.unit === 'weeks') {
    durationInDays = duration.estimated * 7;
  }

  const ratePerDay = baseRate;
  const ratePerHour = Math.round(baseRate / 8);
  const totalEstimated = ratePerDay * durationInDays * workersNeeded;

  return {
    ratePerDay,
    ratePerHour,
    totalEstimated,
    breakdown: [
      {
        description: `Base rate per worker per day`,
        amount: ratePerDay
      },
      {
        description: `Number of workers`,
        amount: workersNeeded
      },
      {
        description: `Duration (${duration.estimated} ${duration.unit})`,
        amount: durationInDays
      }
    ]
  };
};

// Worker matching algorithm
const matchWorkers = async (job) => {
  const query = {
    'availability.status': 'available'
  };

  // Find workers near job location
  if (job.location.city) {
    query['location.city'] = new RegExp(job.location.city, 'i');
  }

  const workers = await Worker.find(query)
    .select('-password -bankDetails')
    .sort({ 
      'rating.average': -1, 
      completedJobs: -1,
      'experience.years': -1 
    })
    .limit(job.workersNeeded * 3); // Get 3x more for better matching

  // Score workers
  const scoredWorkers = workers.map(worker => {
    let score = 0;
    
    // Rating score (40%)
    score += (worker.rating.average / 5) * 40;
    
    // Experience score (30%)
    const expScore = Math.min(worker.experience.years / 10, 1) * 30;
    score += expScore;
    
    // Completed jobs score (20%)
    const jobScore = Math.min(worker.completedJobs / 50, 1) * 20;
    score += jobScore;
    
    // Expert level score (10%)
    const expertScore = { expert: 10, intermediate: 6, beginner: 2 };
    score += expertScore[worker.expertLevel] || 0;

    return {
      worker,
      score,
      matchPercentage: Math.round(score)
    };
  });

  return scoredWorkers.sort((a, b) => b.score - a.score);
};

// @route   POST /api/jobs
// @desc    Create a new job posting
// @access  Private (Employer)
router.post('/', auth, isEmployer, async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      employer: req.user.id
    };

    // Calculate wage automatically
    const wageCalculation = calculateWage(jobData);
    jobData.wageCalculation = wageCalculation;
    
    // Set budget estimated if not provided
    if (!jobData.budget?.estimated) {
      jobData.budget = {
        estimated: wageCalculation.totalEstimated,
        negotiable: true
      };
    }

    const job = new Job(jobData);
    await job.save();

    // Update employer stats
    await Employer.findByIdAndUpdate(req.user.id, {
      $inc: { jobsPosted: 1 }
    });

    // Find matching workers
    const matchedWorkers = await matchWorkers(job);

    // Send notifications to top matched workers
    const io = req.app.get('io');
    matchedWorkers.slice(0, 5).forEach(match => {
      io.to(match.worker._id.toString()).emit('job-match', {
        jobId: job._id,
        jobTitle: job.title,
        matchPercentage: match.matchPercentage
      });
    });

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job,
      matchedWorkers: matchedWorkers.slice(0, 10)
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating job',
      error: error.message
    });
  }
});

// @route   GET /api/jobs
// @desc    Get all jobs (with filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      status, 
      city, 
      jobType,
      page = 1, 
      limit = 10 
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (jobType) query.jobType = jobType;

    const jobs = await Job.find(query)
      .populate('employer', 'name phone location rating companyName')
      .sort({ createdAt: -1 })
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
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get single job by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employer', 'name phone location rating companyName employerType')
      .populate('applications.worker', 'name skills experience rating location')
      .populate('assignedWorkers.worker', 'name skills experience rating phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job',
      error: error.message
    });
  }
});

// @route   PUT /api/jobs/:id
// @desc    Update job
// @access  Private (Employer - job owner only)
router.put('/:id', auth, isEmployer, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user owns this job
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    // Update job
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      job[key] = updates[key];
    });

    await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message
    });
  }
});

// @route   POST /api/jobs/:id/assign
// @desc    Assign workers to a job
// @access  Private (Employer - job owner only)
router.post('/:id/assign', auth, isEmployer, async (req, res) => {
  try {
    const { workerIds, roles, rates } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Assign workers
    for (let i = 0; i < workerIds.length; i++) {
      job.assignedWorkers.push({
        worker: workerIds[i],
        role: roles[i],
        agreedRate: rates[i],
        assignedAt: new Date()
      });

      // Update worker availability
      await Worker.findByIdAndUpdate(workerIds[i], {
        'availability.status': 'busy'
      });

      // Create work history entry
      await WorkHistory.create({
        worker: workerIds[i],
        job: job._id,
        employer: req.user.id,
        jobTitle: job.title,
        category: job.category,
        role: roles[i],
        startDate: job.startDate || new Date(),
        earnings: {
          agreedAmount: rates[i],
          paymentStatus: 'pending'
        },
        status: 'ongoing'
      });

      // Update application status
      const application = job.applications.find(
        app => app.worker.toString() === workerIds[i]
      );
      if (application) {
        application.status = 'accepted';
      }

      // Create a conversation between the worker and employer
      const Conversation = require('../models/Conversation');
      let conversation = await Conversation.findOne({
        participants: { $all: [workerIds[i], req.user.id] },
        job: job._id
      });
      
      if (!conversation) {
        conversation = new Conversation({
          participants: [workerIds[i], req.user.id],
          job: job._id,
          lastMessage: 'Job assigned',
          lastMessageTime: new Date()
        });
        await conversation.save();
      }
      
      // Create notification for worker about job assignment
      const Notification = require('../models/Notification');
      const notification = new Notification({
        recipient: workerIds[i],
        sender: req.user.id,
        type: 'job_assigned',
        title: 'Job Assignment',
        message: `You have been assigned to job: ${job.title}`,
        relatedJob: job._id,
        relatedConversation: conversation._id
      });
      await notification.save();
      
      // Send real-time notification via Socket.IO
      const io = req.app.get('io');
      io.to(workerIds[i].toString()).emit('newNotification', {
        notification: notification
      });
      
      // Also emit job-assigned event
      io.to(workerIds[i]).emit('job-assigned', {
        jobId: job._id,
        jobTitle: job.title,
        startDate: job.startDate
      });

      // Send email to worker
      const worker = await User.findById(workerIds[i]);
      const employer = await User.findById(req.user.id);
      if (worker && worker.email) {
        const emailTemplate = emailTemplates.workerHired(
          worker.name,
          job.title,
          employer.name,
          {
            location: `${job.location.address}, ${job.location.city}`,
            duration: `${job.duration.estimated} ${job.duration.unit}`,
            rate: rates[i],
            startDate: job.startDate
          }
        );
        await sendEmail({
          to: worker.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });
      }
    }

    job.status = 'assigned';
    await job.save();

    res.json({
      success: true,
      message: 'Workers assigned successfully',
      job
    });
  } catch (error) {
    console.error('Assign workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning workers',
      error: error.message
    });
  }
});

// @route   POST /api/jobs/:id/complete
// @desc    Mark job as completed
// @access  Private (Employer - job owner only)
router.post('/:id/complete', auth, isEmployer, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    job.status = 'completed';
    job.actualEndDate = new Date();
    await job.save();

    // Update work histories
    for (const assigned of job.assignedWorkers) {
      const workHistory = await WorkHistory.findOne({
        job: job._id,
        worker: assigned.worker
      });

      if (workHistory) {
        workHistory.status = 'completed';
        workHistory.endDate = new Date();
        workHistory.completionPercentage = 100;
        await workHistory.save();
      }

      // Update worker stats
      await Worker.findByIdAndUpdate(assigned.worker, {
        $inc: { 
          completedJobs: 1,
          totalEarnings: assigned.agreedRate
        },
        'availability.status': 'available'
      });

      // Send notification
      const io = req.app.get('io');
      io.to(assigned.worker.toString()).emit('job-completed', {
        jobId: job._id,
        jobTitle: job.title
      });
    }

    res.json({
      success: true,
      message: 'Job marked as completed',
      job
    });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing job',
      error: error.message
    });
  }
});

// @route   POST /api/jobs/estimate
// @desc    Get job cost estimation
// @access  Public
router.post('/estimate', async (req, res) => {
  try {
    const wageCalculation = calculateWage(req.body);
    
    res.json({
      success: true,
      estimation: wageCalculation
    });
  } catch (error) {
    console.error('Estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating estimation',
      error: error.message
    });
  }
});

// @route   GET /api/jobs/:id/matched-workers
// @desc    Get matched workers for a job
// @access  Private (Employer - job owner only)
router.get('/:id/matched-workers', auth, isEmployer, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const matchedWorkers = await matchWorkers(job);

    res.json({
      success: true,
      matchedWorkers
    });
  } catch (error) {
    console.error('Get matched workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding matched workers',
      error: error.message
    });
  }
});

// @route   POST /api/jobs/:id/apply
// @desc    Worker applies for a job
// @access  Private (Worker)
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if worker already applied
    const alreadyApplied = job.applications.some(
      app => app.worker.toString() === req.user.id
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Add application
    const { proposedRate, message } = req.body;
    job.applications.push({
      worker: req.user.id,
      proposedRate: proposedRate || job.wageCalculation.totalEstimated,
      message: message || 'Interested in this job',
      status: 'pending'
    });

    await job.save();

    // Send notification to employer
    const io = req.app.get('io');
    io.to(job.employer.toString()).emit('new-application', {
      jobId: job._id,
      jobTitle: job.title,
      workerId: req.user.id,
      applicantCount: job.applications.length
    });
    
    // Create a conversation between the worker and employer
    const Conversation = require('../models/Conversation');
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, job.employer] },
      job: job._id
    });
    
    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user.id, job.employer],
        job: job._id,
        lastMessage: 'Job application submitted',
        lastMessageTime: new Date()
      });
      await conversation.save();
    }

    res.json({
      success: true,
      message: 'Job application submitted successfully',
      application: {
        jobId: job._id,
        jobTitle: job.title,
        status: 'pending'
      }
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

// @route   POST /api/jobs/:id/accept
// @desc    Worker accepts a job assignment
// @access  Private (Worker)
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employer', 'name email')
      .populate('assignedWorkers.worker', 'name');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if this worker is assigned to this job
    const assignedWorker = job.assignedWorkers.find(
      aw => aw.worker._id.toString() === req.user.id
    );

    if (!assignedWorker) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this job'
      });
    }

    // Update worker's acceptance status
    assignedWorker.accepted = true;
    assignedWorker.acceptedAt = new Date();
    job.status = 'accepted_by_worker';
    
    await job.save();

    // Get the worker's details
    const worker = await User.findById(req.user.id);
    
    // Create or get existing conversation between employer and worker
    const Conversation = require('../models/Conversation');
    let conversation = await Conversation.findOne({
      participants: { $all: [job.employer._id, req.user.id] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [job.employer._id, req.user.id],
        job: job._id
      });
      await conversation.save();
    }
    
    // Create a message about the acceptance
    const Message = require('../models/Message');
    const acceptanceMessage = new Message({
      conversationId: conversation._id,
      sender: req.user.id,
      message: `${worker.name} has accepted the job assignment for ${job.title}.`,
      messageType: 'job_acceptance'
    });
    
    await acceptanceMessage.save();
    
    // Update conversation with last message info
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: `${worker.name} accepted the job assignment`,
      lastMessageTime: new Date(),
      $inc: { [`unreadCount.${job.employer._id}`]: 1 }
    });
    
    // Create notification for employer
    const Notification = require('../models/Notification');
    const notification = new Notification({
      recipient: job.employer._id,
      sender: req.user.id,
      type: 'job_accepted',
      title: 'Job Accepted',
      message: `${worker.name} has accepted your job assignment for ${job.title}.`,
      relatedJob: job._id,
      relatedConversation: conversation._id
    });
    await notification.save();

    // Emit real-time notification via Socket.IO
    const io = req.app.get('io');
    io.to(job.employer._id.toString()).emit('newNotification', {
      notification: notification
    });
    
    // Also emit to the worker to update their UI
    io.to(req.user.id.toString()).emit('jobAccepted', {
      jobId: job._id,
      jobTitle: job.title
    });

    res.json({
      success: true,
      message: 'Job accepted successfully',
      job
    });
  } catch (error) {
    console.error('Accept job assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting job assignment',
      error: error.message
    });
  }
});

// @route   POST /api/jobs/:id/reject
// @desc    Worker rejects a job assignment
// @access  Private (Worker)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employer', 'name email')
      .populate('assignedWorkers.worker', 'name');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if this worker is assigned to this job
    const assignedWorkerIndex = job.assignedWorkers.findIndex(
      aw => aw.worker._id.toString() === req.user.id
    );

    if (assignedWorkerIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this job'
      });
    }

    // Remove the worker from assigned workers or mark as rejected
    job.assignedWorkers[assignedWorkerIndex].rejected = true;
    job.assignedWorkers[assignedWorkerIndex].rejectedAt = new Date();
    
    // If this was the only worker assigned, we might want to change job status
    if (job.assignedWorkers.length === 1 && job.assignedWorkers[assignedWorkerIndex].rejected) {
      job.status = 'open'; // Change back to open so other workers can apply
    }
    
    await job.save();

    // Get the worker's details
    const worker = await User.findById(req.user.id);
    
    // Create or get existing conversation between employer and worker
    const Conversation = require('../models/Conversation');
    let conversation = await Conversation.findOne({
      participants: { $all: [job.employer._id, req.user.id] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [job.employer._id, req.user.id],
        job: job._id
      });
      await conversation.save();
    }
    
    // Create a message about the rejection
    const Message = require('../models/Message');
    const rejectionMessage = new Message({
      conversationId: conversation._id,
      sender: req.user.id,
      message: `${worker.name} has rejected the job assignment for ${job.title}.`,
      messageType: 'job_rejection'
    });
    
    await rejectionMessage.save();
    
    // Update conversation with last message info
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: `${worker.name} rejected the job assignment`,
      lastMessageTime: new Date(),
      $inc: { [`unreadCount.${job.employer._id}`]: 1 }
    });
    
    // Create notification for employer
    const Notification = require('../models/Notification');
    const notification = new Notification({
      recipient: job.employer._id,
      sender: req.user.id,
      type: 'job_rejected',
      title: 'Job Rejected',
      message: `${worker.name} has rejected your job assignment for ${job.title}.`,
      relatedJob: job._id,
      relatedConversation: conversation._id
    });
    await notification.save();

    // Emit real-time notification via Socket.IO
    const io = req.app.get('io');
    io.to(job.employer._id.toString()).emit('newNotification', {
      notification: notification
    });
    
    // Also emit to the worker to update their UI
    io.to(req.user.id.toString()).emit('jobRejected', {
      jobId: job._id,
      jobTitle: job.title
    });

    res.json({
      success: true,
      message: 'Job rejected successfully',
      job
    });
  } catch (error) {
    console.error('Reject job assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting job assignment',
      error: error.message
    });
  }
});

// @route   POST /api/jobs/book-worker
// @desc    Employer books a worker directly
// @access  Private (Employer)
router.post('/book-worker', auth, async (req, res) => {
  try {
    // Check if user is employer
    if (req.user.role !== 'employer') {
      console.log('❌ Access denied - user is not employer:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employer role required.'
      });
    }

    console.log('🔍 Book worker endpoint called');
    console.log('👤 Request user:', req.user);
    console.log('📦 Request body:', req.body);
    
    const { workerId, category, isEmergency } = req.body;

    console.log('✅ Extracted data:', { workerId, category, isEmergency });

    // Create a new booking request
    const booking = new Booking({
      employer: req.user.id,
      worker: workerId,
      category: category,
      isEmergency: isEmergency || false,
      proposedRate: 500, // Default rate - this could be made configurable
      message: `Employer wants to book you for ${category} work${isEmergency ? ' (Emergency)' : ''}`,
      status: 'pending'
    });

    await booking.save();

    // Create notification for worker
    const workerNotification = new Notification({
      recipient: workerId,
      sender: req.user.id,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `You have a new booking request for ${category} work${isEmergency ? ' (Emergency)' : ''}`,
    });
    await workerNotification.save();

    // Send real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Need employer data to fill the frontend's expected properties
      const employer = await User.findById(req.user.id);
      io.to(workerId.toString()).emit('newNotification', {
        notification: {
          _id: workerNotification._id,
          type: 'booking_request',
          employerId: req.user.id,
          employerName: employer ? employer.name : 'Employer',
          category: category,
          isEmergency: isEmergency || false,
          propsedRate: 500,
          message: workerNotification.message,
          createdAt: workerNotification.createdAt,
          read: false,
          bookingId: booking._id
        }
      });
    }

    const response = {
      success: true,
      message: 'Booking request sent to worker successfully!',
      bookingId: booking._id
    };
    
    console.log('📤 Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Book worker error:', error);
    console.error('🔗 Full error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error booking worker',
      error: error.message
    });
  }
});

module.exports = router;
