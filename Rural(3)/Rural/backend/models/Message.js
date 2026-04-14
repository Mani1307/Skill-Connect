const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Will reference either Employer or Worker
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Will reference either Employer or Worker
    required: true
  },
  message: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'job_offer', 'acceptance', 'decline'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false
  },
  delivered: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ sender: 1, timestamp: -1 });
messageSchema.index({ receiver: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);