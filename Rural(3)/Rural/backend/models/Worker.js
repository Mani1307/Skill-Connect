const mongoose = require('mongoose');
const User = require('./User');

const workerSchema = new mongoose.Schema({
  age: {
    type: Number,
    min: 18,
    max: 80
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  skills: [{
    type: String,
    enum: ['painter', 'electrician', 'mason', 'helper', 'plumber', 'carpenter', 'welder', 'cleaner', 'gardener', 'loader', 'fabricator', 'tiler', 'other']
  }],
  experience: {
    years: {
      type: Number,
      default: 0,
      min: 0
    },
    description: String
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    preferredWorkDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
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
  completedJobs: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  expertLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert'],
    default: 'beginner'
  },
  canLeadGroup: {
    type: Boolean,
    default: false
  },
  profileImage: String,
  identityProof: {
    type: String,
    documentType: String
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String
  },
  languages: [String],
  certificates: [{
    title: String,
    issuedBy: String,
    issuedDate: Date,
    document: String
  }]
});

// Update expert level based on experience and ratings
workerSchema.methods.updateExpertLevel = function() {
  if (this.experience.years >= 5 && this.rating.average >= 4.5) {
    this.expertLevel = 'expert';
    this.canLeadGroup = true;
  } else if (this.experience.years >= 2 && this.rating.average >= 3.5) {
    this.expertLevel = 'intermediate';
  } else {
    this.expertLevel = 'beginner';
  }
};

const Worker = User.discriminator('worker', workerSchema);

module.exports = Worker;
