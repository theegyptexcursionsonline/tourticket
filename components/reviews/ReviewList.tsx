// components/reviews/ReviewList.tsx
import React from 'react';
import { Star, UserCircle } from 'lucide-react';
import { Review } from '@/types'; // You'll need to define this type

interface ReviewListProps {
  reviews: Review[];
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No reviews yet for this tour. Be the first to leave a review!</p>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h3 className="text-3xl font-bold text-gray-900 mb-6">What our travelers are saying</h3>
      <div className="space-y-8">
        {reviews.map((review) => (
          <article key={review._id} className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {review.user?.picture ? (
                  <img className="h-12 w-12 rounded-full object-cover" src={review.user.picture} alt={review.user.name} />
                ) : (
                  <UserCircle className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-base font-bold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                    </div>
                    <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                            <Star
                            key={i}
                            className={`h-5 w-5 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                            />
                        ))}
                    </div>
                </div>
                <p className="mt-3 text-gray-700 leading-relaxed">{review.comment}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ReviewList;