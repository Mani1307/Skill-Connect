import React, { useState } from 'react';
import api from '../utils/api';
import './RatingModal.css';

const RatingModal = ({ jobId, ratedUserId, ratedUserName, onClose, onRatingSuccess }) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/ratings', {
        jobId,
        ratedUserId,
        rating,
        review
      });
      alert('Thank you for your feedback!');
      onRatingSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Rate your experience with {ratedUserName}</h2>
        <form onSubmit={handleSubmit}>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= rating ? 'star active' : 'star'}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>
          <div className="form-group">
            <label>Your Review</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell others about your experience..."
              rows="4"
              required
            ></textarea>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RatingModal;
