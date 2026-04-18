const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['painting', 'electrical', 'masonry', 'plumbing', 'carpentry', 'welding', 'construction', 'cleaning', 'gardening', 'loading', 'fabrication', 'tiling', 'other'],
    required: true
  },
  jobType: {
    type: String,
    enum: ['single-worker', 'group'],
    required: true
  },
  requiredSkills: [{
    type: String,
    required: true
  }],
  workersNeeded: {
    type: Number,
    default: 1,
    min: 1
  },
  needsExpert: {
    type: Boolean,
    default: false
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  duration: {
    estimated: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks'],
      default: 'days'
    }
  },
  budget: {
    estimated: {
      type: Number,
      required: true
    },
    negotiable: {
      type: Boolean,
      default: true
    }
  },
  wageCalculation: {
    ratePerDay: Number,
    ratePerHour: Number,
    totalEstimated: Number,
    breakdown: [{
      description: String,
      amount: Number
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  },
  applications: [{
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    proposedRate: Number,
    message: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  assignedWorkers: [{
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['expert', 'worker', 'helper']
    },
    agreedRate: Number,
    assignedAt: Date,
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    rejected: {
      type: Boolean,
      default: false
    },
    rejectedAt: Date
  }],
  startDate: Date,
  endDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,
  images: [String],
  requirements: [String],
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better search performance
jobSchema.index({ category: 1, status: 1, 'location.city': 1 });
jobSchema.index({ employer: 1, status: 1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
