const mongoose = require('mongoose');

const workHistorySchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobTitle: String,
  category: String,
  role: {
    type: String,
    enum: ['expert', 'worker', 'helper']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  duration: {
    days: Number,
    hours: Number
  },
  earnings: {
    agreedAmount: Number,
    actualAmount: Number,
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed'],
      default: 'pending'
    }
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'cancelled'],
    default: 'ongoing'
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  attendanceRecords: [{
    date: Date,
    checkIn: Date,
    checkOut: Date,
    hoursWorked: Number,
    verified: Boolean
  }],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
workHistorySchema.index({ worker: 1, status: 1 });
workHistorySchema.index({ job: 1 });

const WorkHistory = mongoose.model('WorkHistory', workHistorySchema);

module.exports = WorkHistory;
