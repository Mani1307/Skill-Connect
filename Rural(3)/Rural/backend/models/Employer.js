const mongoose = require('mongoose');
const User = require('./User');

const employerSchema = new mongoose.Schema({
  employerType: {
    type: String,
    enum: ['household', 'contractor', 'business', 'other'],
    default: 'household'
  },
  companyName: String,
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  jobsPosted: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  preferredPaymentMethod: {
    type: String,
    enum: ['cash', 'online', 'both'],
    default: 'both'
  }
});

const Employer = User.discriminator('employer', employerSchema);

module.exports = Employer;
