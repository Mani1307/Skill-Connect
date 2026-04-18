const express = require('express');
const router = express.Router();
const { auth, isEmployerOrWorker } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @route   POST /api/chat/conversation
// @desc    Create or get existing conversation
// @access  Private
router.post('/conversation', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { participantId, jobId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required'
      });
    }

    // Check if conversation already exists between these participants
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId] },
      ...(jobId && { job: jobId })
    });

    if (existingConversation) {
      return res.json({
        success: true,
        conversation: existingConversation
      });
    }

    // Create new conversation
    const newConversation = new Conversation({
      participants: [req.user.id, participantId],
      job: jobId || null
    });

    await newConversation.save();

    res.json({
      success: true,
      conversation: newConversation
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating conversation',
      error: error.message
    });
  }
});

// @route   GET /api/chat/conversations
// @desc    Get all conversations for a user
// @access  Private
router.get('/conversations', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
    .populate([
      { path: 'participants', select: 'name email role avatar phone rating' },
      { path: 'job', select: 'title category' }
    ])
    .sort({ lastMessageTime: -1 });

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching conversations',
      error: error.message
    });
  }
});

// @route   GET /api/chat/conversation/:id/messages
// @desc    Get messages for a conversation
// @access  Private
router.get('/conversation/:id/messages', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is part of the conversation
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }

    const messages = await Message.find({ conversationId: id })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read for this user
    await Message.updateMany(
      {
        conversationId: id,
        receiver: req.user.id,
        read: false
      },
      { read: true }
    );

    // Update unread count in conversation
    const updateUnreadCount = {};
    updateUnreadCount[req.user.id] = 0;
    await Conversation.findByIdAndUpdate(id, {
      $set: { unreadCount: updateUnreadCount }
    });

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Message.countDocuments({ conversationId: id })
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching messages',
      error: error.message
    });
  }
});

// @route   POST /api/chat/message
// @desc    Send a message
// @access  Private
router.post('/message', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { conversationId, receiverId, message, messageType = 'text' } = req.body;

    if (!conversationId && !receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Either conversationId or receiverId is required'
      });
    }

    // If no conversationId, create one
    let conversation;
    if (!conversationId) {
      const existingConversation = await Conversation.findOne({
        participants: { $all: [req.user.id, receiverId] }
      });

      if (existingConversation) {
        conversation = existingConversation;
      } else {
        conversation = new Conversation({
          participants: [req.user.id, receiverId]
        });
        await conversation.save();
      }
    } else {
      conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to send message to this conversation'
        });
      }
    }

    const newMessage = new Message({
      conversationId: conversation._id,
      sender: req.user.id,
      receiver: receiverId,
      message,
      messageType
    });

    // Block chat if job offer exists but is not accepted
    if (conversation.jobOffer && conversation.jobOffer.status !== 'accepted') {
      return res.status(403).json({
        success: false,
        message: 'Chat is disabled until the job offer is accepted by the worker.'
      });
    }

    await newMessage.save();

    // Update conversation with last message info
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message.substring(0, 100),
      lastMessageTime: new Date(),
      $inc: { [`unreadCount.${receiverId}`]: 1 }
    });

    // Emit real-time notification via Socket.IO
    const io = req.app.get('io');
    io.to(receiverId).emit('newMessage', {
      message: newMessage,
      conversationId: conversation._id
    });

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message',
      error: error.message
    });
  }
});

// @route   PUT /api/chat/message/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/message/:id/read', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message || message.receiver.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this message as read'
      });
    }

    await Message.findByIdAndUpdate(req.params.id, { read: true });

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking message as read',
      error: error.message
    });
  }
});

// @route   GET /api/chat/conversation/:id
// @desc    Get conversation details
// @access  Private
router.get('/conversation/:id', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate([
        { path: 'participants', select: 'name email role avatar phone rating' },
        { path: 'job', select: 'title category' }
      ]);

    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching conversation',
      error: error.message
    });
  }
});

// @route   POST /api/chat/conversation/:id/job-offer
// @desc    Make a job offer in a conversation
// @access  Private (employer only)
router.post('/conversation/:id/job-offer', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { jobId, message } = req.body;
    const conversationId = req.params.id;
    
    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }
    
    // Verify user is an employer
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can make job offers'
      });
    }
    
    // Update conversation with job offer details
    conversation.jobOffer = {
      jobId: jobId,
      offeredBy: req.user.id,
      status: 'pending',
      offeredAt: new Date()
    };
    
    await conversation.save();
    
    // Fetch other participant
    let otherParticipant = conversation.participants.find(id => id.toString() !== req.user.id.toString());
    if (!otherParticipant) otherParticipant = req.user.id;
    
    // Create a message about the job offer
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: req.user.id,
      receiver: otherParticipant,
      message: message || 'A job offer has been made.',
      messageType: 'job_offer'
    });
    
    await newMessage.save();
    
    // Update conversation with last message info
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message || 'A job offer has been made.',
      lastMessageTime: new Date(),
      $inc: { [`unreadCount.${otherParticipant.toString()}`]: 1 }
    });
    
    // Create Notification
    const workerNotification = new Notification({
      recipient: otherParticipant,
      sender: req.user.id,
      type: 'job_offer',
      title: 'New Job Offer',
      message: message || `You have received a new job offer.`,
      relatedConversation: conversation._id
    });
    await workerNotification.save();

    // Emit real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(otherParticipant.toString()).emit('newNotification', {
        notification: {
          _id: workerNotification._id,
          type: 'job_offer',
          employerId: req.user.id,
          employerName: user.name || 'Employer',
          message: workerNotification.message,
          createdAt: workerNotification.createdAt,
          read: false,
          conversationId: conversation._id
        }
      });
      io.to(otherParticipant.toString()).emit('newMessage', {
        message: newMessage,
        conversationId: conversation._id
      });
    }
    
    res.json({
      success: true,
      message: 'Job offer made successfully',
      conversation
    });
  } catch (error) {
    console.error('Job offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error making job offer',
      error: error.stack
    });
  }
});

// @route   PUT /api/chat/conversation/:id/job-offer/response
// @desc    Respond to a job offer (accept/reject)
// @access  Private (worker only)
router.put('/conversation/:id/job-offer/response', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const conversationId = req.params.id;
    
    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }
    
    // Verify user is a worker
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'worker') {
      return res.status(403).json({
        success: false,
        message: 'Only workers can respond to job offers'
      });
    }
    
    if (!conversation.jobOffer) {
      return res.status(400).json({
        success: false,
        message: 'No job offer found in this conversation'
      });
    }
    
    if (conversation.jobOffer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Job offer already responded to'
      });
    }
    
    // Update job offer status
    if (action === 'accept') {
      conversation.jobOffer.status = 'accepted';
      conversation.jobOffer.acceptedAt = new Date();
      
      // Update the job to assign this worker
      if (conversation.jobOffer.jobId) {
        const Job = require('../models/Job');
        await Job.findByIdAndUpdate(conversation.jobOffer.jobId, {
          assignedWorker: conversation.jobOffer.offeredBy.toString() === req.user.id ? 
            conversation.participants.find(id => id.toString() !== req.user.id) :
            req.user.id,
          status: 'assigned'
        });
      }
    } else if (action === 'reject') {
      conversation.jobOffer.status = 'rejected';
      conversation.jobOffer.rejectedAt = new Date();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "accept" or "reject"'
      });
    }
    
    await conversation.save();
    
    // Fetch other participant
    let otherParticipant = conversation.participants.find(id => id.toString() !== req.user.id.toString());
    if (!otherParticipant) otherParticipant = req.user.id;
    
    // Create a response message
    const responseMessage = action === 'accept' ? 'Job offer accepted.' : 'Job offer rejected.';
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: req.user.id,
      receiver: otherParticipant,
      message: responseMessage,
      messageType: action === 'accept' ? 'acceptance' : 'decline'
    });
    
    await newMessage.save();
    
    // Update conversation with last message info
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: responseMessage,
      lastMessageTime: new Date(),
      $inc: { [`unreadCount.${otherParticipant.toString()}`]: 1 }
    });
    
    // Create Notification
    const employerNotification = new Notification({
      recipient: otherParticipant,
      sender: req.user.id,
      type: action === 'accept' ? 'job_accepted' : 'booking_rejected',
      title: action === 'accept' ? 'Job Offer Accepted!' : 'Job Offer Rejected',
      message: action === 'accept' ? `${user.name} accepted your job offer!` : `${user.name} rejected your job offer.`,
      relatedConversation: conversation._id
    });
    await employerNotification.save();

    // Emit real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(otherParticipant.toString()).emit('newNotification', {
        notification: {
          _id: employerNotification._id,
          type: action === 'accept' ? 'job_accepted' : 'booking_rejected',
          workerId: req.user.id,
          workerName: user.name || 'Worker',
          message: employerNotification.message,
          createdAt: employerNotification.createdAt,
          read: false,
          conversationId: conversation._id
        }
      });
      io.to(otherParticipant.toString()).emit('newMessage', {
        message: newMessage,
        conversationId: conversation._id
      });
    }
    
    res.json({
      success: true,
      message: `Job offer ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
      conversation
    });
  } catch (error) {
    console.error('Job offer response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error responding to job offer',
      error: error.message
    });
  }
});

// @route   GET /api/chat/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    
    const query = { recipient: req.user.id };
    if (type) {
      query.type = type;
    }
    
    const notifications = await Notification.find(query)
      .populate('sender', 'name')
      .populate('relatedJob', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Notification.countDocuments(query);
    
    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notifications',
      error: error.message
    });
  }
});

// @route   PUT /api/chat/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/notifications/:id/read', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification || notification.recipient.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this notification as read'
      });
    }
    
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notification as read',
      error: error.message
    });
  }
});

// @route   PUT /api/chat/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/notifications/read-all', auth, isEmployerOrWorker, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking all notifications as read',
      error: error.message
    });
  }
});

module.exports = router;