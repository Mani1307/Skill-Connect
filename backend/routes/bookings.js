const express = require('express');
const router = express.Router();
const { auth, isEmployerOrWorker } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @route   POST /api/bookings/:id/confirm
// @desc    Confirm a booking (final check before work starts)
// @access  Private (Employer only)
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const { finalTime, finalLocation, finalAgreedPrice } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    booking.status = 'confirmed';
    booking.finalTime = finalTime || booking.finalTime;
    booking.finalLocation = finalLocation || booking.finalLocation;
    booking.finalAgreedPrice = finalAgreedPrice || booking.finalAgreedPrice;
    booking.updatedAt = new Date();

    await booking.save();

    // Notify worker
    const notification = new Notification({
      recipient: booking.worker,
      sender: req.user.id,
      type: 'booking_confirmed',
      title: 'Booking Confirmed!',
      message: `Your booking for ${booking.category} has been confirmed for ${new Date(booking.finalTime).toLocaleString()}.`,
      relatedBooking: booking._id
    });
    await notification.save();

    res.json({ success: true, message: 'Booking confirmed', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/bookings/:id/complete
// @desc    Mark booking as completed
// @access  Private (Employer only)
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    booking.status = 'completed';
    booking.updatedAt = new Date();
    await booking.save();

    // Update worker's completed jobs and total earnings
    const Worker = require('../models/Worker');
    await Worker.findByIdAndUpdate(booking.worker, {
      $inc: { completedJobs: 1, totalEarnings: booking.finalAgreedPrice || 0 }
    });

    // Notify worker
    const notification = new Notification({
      recipient: booking.worker,
      sender: req.user.id,
      type: 'booking_completed',
      title: 'Job Completed',
      message: `The job for ${booking.category} has been marked as completed. Please rate the employer.`,
      relatedBooking: booking._id
    });
    await notification.save();

    res.json({ success: true, message: 'Booking completed', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel a booking
// @access  Private (Either party)
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.employer.toString() !== req.user.id && booking.worker.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Time-based restriction (optional): Cannot cancel if confirmed and within 1 hour of scheduled time
    if (booking.status === 'confirmed' && booking.finalTime) {
        const timeDiff = new Date(booking.finalTime) - new Date();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff < 1) {
            // Can still cancel but maybe apply penalty logic later
            // For now just allow with warning or restriction
        }
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledBy = req.user.id;
    booking.updatedAt = new Date();
    await booking.save();

    const otherParty = booking.employer.toString() === req.user.id ? booking.worker : booking.employer;

    // Notify other party
    const notification = new Notification({
      recipient: otherParty,
      sender: req.user.id,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `The booking for ${booking.category} has been cancelled. Reason: ${reason}`,
      relatedBooking: booking._id
    });
    await notification.save();

    res.json({ success: true, message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/bookings/:id/complain
// @desc    Raise a complaint/dispute
// @access  Private (Either party)
router.post('/:id/complain', auth, async (req, res) => {
  try {
    const { type, description } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const raisedAgainst = booking.employer.toString() === req.user.id ? booking.worker : booking.employer;

    const complaint = new Complaint({
      booking: booking._id,
      raisedBy: req.user.id,
      raisedAgainst,
      type,
      description
    });

    await complaint.save();

    res.json({ success: true, message: 'Complaint raised successfully', complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
