// components/reviews/ReviewForm.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  tourId: string;
  onReviewSubmitted: (newReview: any) => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ tourId, onReviewSubmitted }) => {
  const { user, isAuthenticated } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !comment.trim()) {
      toast.error('Please provide a rating and a comment.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tours/${tourId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // You might need to include an auth token if your API is protected
        },
        body: JSON.stringify({ rating, comment }),
      });
      const newReview = await response.json();
      if (!response.ok) {
        throw new Error(newReview.error || 'Failed to submit review.');
      }
      toast.success('Thank you for your review!');
      onReviewSubmitted(newReview); // Pass the new review up to the parent
      setRating(0);
      setComment('');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-600">Please log in to leave a review.</p>
        {/* Optionally, add a login button here */}
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Leave a Review</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Rating</label>
                <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`h-8 w-8 cursor-pointer transition-colors ${
                                (hoverRating || rating) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        />
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Review
                </label>
                <textarea
                    id="comment"
                    name="comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    placeholder={`Tell us about your experience with the tour...`}
                    required
                />
            </div>
            <div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Review'
                    )}
                </button>
            </div>
        </form>
    </div>
  );
};

export default ReviewForm;