const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['painting', 'plumbing', 'electrical', 'cleaning', 'gardening', 'loading', 'fabrication', 'tiling']
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  proposedRate: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'rejected', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  finalTime: {
    type: Date
  },
  finalLocation: {
    address: String,
    city: String,
    district: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  finalAgreedPrice: {
    type: Number
  },
  cancellationReason: {
    type: String
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
bookingSchema.index({ worker: 1, status: 1 });
bookingSchema.index({ employer: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
