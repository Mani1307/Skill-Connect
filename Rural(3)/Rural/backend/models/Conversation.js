const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number, // Map of userId -> unread count
    default: new Map()
  },
  jobOffer: {
    // Details about a job offer made in this conversation
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    offeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    offeredAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: Date,
    rejectedAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
conversationSchema.index({ participants: 1 });
conversationSchema.index({ job: 1 });
conversationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);