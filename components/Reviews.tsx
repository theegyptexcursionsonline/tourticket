// components/Reviews.tsx
'use client';

import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const reviewsData = [
  {
    name: 'Alexandra',
    country: 'Sweden',
    review: 'The Stockholm tour was exceptional. The guide was knowledgeable and the sights were breathtaking. A must-do!',
    rating: 5,
    image: '/stockholm.png',
  },
  {
    name: 'Ben',
    country: 'USA',
    review: 'Copenhagen is a magical city and this tour captured its essence perfectly. Highly recommend to everyone.',
    rating: 5,
    image: '/copenhagen.png',
  },
  {
    name: 'Chloe',
    country: 'Australia',
    review: "I've been on many tours, but the Icebar experience was unique. The intricate ice sculptures were a sight to behold.",
    rating: 5,
    image: '/iceberg.png',
  },
  {
    name: 'David',
    country: 'Canada',
    review: 'A great way to see the city. The boat tour was relaxing and offered a different perspective of Stockholm.',
    rating: 4,
    image: '/stockholm.png',
  },
    {
    name: 'Emily',
    country: 'UK',
    review: 'The tour was well-organized and our guide was fantastic. The highlight was definitely the Viking museum!',
    rating: 5,
    image: '/copenhagen.png',
  },
  {
    name: 'Frank',
    country: 'Germany',
    review: 'The Icebar was a fun and chilly experience. A bit touristy, but worth it for the novelty.',
    rating: 4,
    image: '/iceberg.png',
  }
];

const Reviews = () => {

  const scrollLeft = () => {
    const container = document.getElementById('reviews-container');
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('reviews-container');
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-gray-50 py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">What Our Guests Say</h2>
            <p className="text-gray-600">Real stories from our valued customers.</p>
          </div>
          <div className="hidden md:flex gap-2">
            <button onClick={scrollLeft} className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <button onClick={scrollRight} className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors">
              <ChevronRight className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>

                <div id="reviews-container" className="flex overflow-x-auto gap-6 pb-4 scroll-smooth" style={{ scrollbarWidth: 'none', 'msOverflowStyle': 'none' }}>
                    <div className="flex-shrink-0 w-1"></div> {/* Left padding */}
                    {reviewsData.map((review, index) => (
                        <div key={index} className="flex-shrink-0 w-80 bg-white p-6 rounded-lg shadow-lg">
                            <div className="flex items-center mb-4">
                                <img src={review.image} alt={review.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                                <div>
                                    <h3 className="font-semibold text-gray-800">{review.name}</h3>
                                    <p className="text-sm text-gray-500">{review.country}</p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-4 text-sm">&quot;{review.review}&quot;</p>
                            <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" />
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="flex-shrink-0 w-1"></div> {/* Right padding */}
                </div>
            </div>
    </section>
  );
};

export default Reviews;