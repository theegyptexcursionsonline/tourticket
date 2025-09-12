// app/admin/reviews/page.tsx
'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import { Star, MessageSquare, User, Map, Trash2, CheckCircle, ShieldCheck } from 'lucide-react';

// --- Type Definitions ---
interface Review {
  _id: string;
  user: {
    name: string;
  };
  tour: {
    title: string;
  };
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
}

// --- Star Rating Component ---
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))}
  </div>
);


const ReviewsPage = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch all reviews ---
  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/reviews');
        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // --- Approve a Review ---
  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true }),
      });
      if (!response.ok) throw new Error('Failed to approve review');
      const updatedReview = await response.json();
      
      // Update the review in the local state
      setReviews(reviews.map(r => r._id === id ? updatedReview : r));

    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };

  // --- Delete a Review ---
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete review');
      
      // Remove the review from the local state
      setReviews(reviews.filter(r => r._id !== id));
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading reviews...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <MessageSquare className="h-8 w-8 mr-3 text-slate-600" />
        <h1 className="text-3xl font-bold text-slate-800">Review Management</h1>
      </div>
      
      <div className="space-y-6">
        {reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review._id} className="bg-white p-6 rounded-lg shadow-md transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center mb-2">
                    <StarRating rating={review.rating} />
                    <span className={`ml-4 px-3 py-1 text-xs font-semibold rounded-full ${
                        review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {review.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-slate-700 italic">"{review.comment}"</p>
                </div>
                <div className="flex items-center space-x-3">
                    {!review.isApproved && (
                      <button 
                          onClick={() => handleApprove(review._id)} 
                          title="Approve"
                          className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                      >
                          <ShieldCheck className="h-5 w-5"/>
                      </button>
                    )}
                    <button 
                        onClick={() => handleDelete(review._id)} 
                        title="Delete"
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                    >
                        <Trash2 className="h-5 w-5"/>
                    </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
                <div className="flex items-center mb-2 sm:mb-0">
                  <User className="h-4 w-4 mr-2" />
                  <span>{review.user.name}</span>
                  <span className="mx-2">|</span>
                  <Map className="h-4 w-4 mr-2" />
                  <span className="font-semibold">{review.tour.title}</span>
                </div>
                <span>{new Date(review.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-white rounded-lg shadow-md">
            <p className="text-slate-500">No reviews have been submitted yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(ReviewsPage);