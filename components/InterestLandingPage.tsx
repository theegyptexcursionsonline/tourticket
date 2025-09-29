// components/InterestLandingPage.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Users, Clock, MapPin, Heart,
  MessageCircle, Star
} from 'lucide-react';
import { Tour, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import RelatedInterests from './RelatedInterests';
import PopularInterestsGrid from './PopularInterestsGrid';

interface InterestData {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category?: any;
  tours: Tour[];
  totalTours: number;
  reviews: Review[];
  relatedCategories: any[];
  heroImage: string;
  highlights: string[];
  features: string[];
  stats: {
    totalTours: number;
    totalReviews: number;
    averageRating: string;
    happyCustomers: number;
  };
}

interface InterestLandingPageProps {
  interest: InterestData;
}

const TourCard = ({ tour, index }: { tour: Tour; index: number }) => {
  const { formatPrice } = useSettings();
  const destination = typeof tour.destination === 'object' ? tour.destination : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        href={`/tour/${tour.slug}`}
        className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 block border border-gray-200"
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {tour.isFeatured && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded">
              Bestseller
            </div>
          )}

          <div className="absolute bottom-3 right-3 bg-white px-2 py-1 rounded shadow-lg">
            <div className="text-sm font-bold text-gray-900">
              {formatPrice(tour.discountPrice || tour.price || 0)}
            </div>
          </div>

          <button className="absolute top-3 right-3 bg-white/80 p-1.5 rounded-full text-gray-600 hover:text-red-500 hover:bg-white transition-all duration-200">
            <Heart className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-base mb-2 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">
            {tour.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{tour.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Up to {tour.maxGroupSize || 15}</span>
            </div>
          </div>
          
          {destination && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>{destination.name}</span>
            </div>
          )}

          {tour.highlights && tour.highlights.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {tour.highlights.slice(0, 2).map((highlight, i) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
                  >
                    {highlight.length > 15 ? highlight.substring(0, 15) + '...' : highlight}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              {tour.originalPrice && tour.originalPrice > (tour.discountPrice || tour.price || 0) && (
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(tour.originalPrice)}
                </span>
              )}
              <div className="text-lg font-bold text-gray-900">
                {formatPrice(tour.discountPrice || tour.price || 0)}
              </div>
            </div>
            <div className="text-xs text-gray-500">per person</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const ReviewsSection = ({ reviews }: { reviews: Review[] }) => {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((review) => (
            <div
              key={review._id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {review.userName ? review.userName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-900">{review.userName || 'Anonymous'}</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                {review.comment}
              </p>
              
              <div className="text-xs text-gray-500 mt-3">
                {new Date(review.createdAt || review.date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function InterestLandingPage({ interest }: InterestLandingPageProps) {
  const availableTours = interest.tours || [];

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={interest.heroImage}
            alt={interest.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        </div>
        
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="container mx-auto px-6">
            <div className="text-white text-center max-w-4xl mx-auto">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-6xl font-bold mb-4"
              >
                {interest.name}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto"
              >
                {interest.description}
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* Tours Section */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Things to do in {interest.name}
            </h2>
            <p className="text-gray-600">
              {availableTours.length} experience{availableTours.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableTours.map((tour, index) => (
              <TourCard key={tour._id} tour={tour} index={index} />
            ))}
          </div>

          {availableTours.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No experiences available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      {interest.reviews && interest.reviews.length > 0 && (
        <ReviewsSection reviews={interest.reviews} />
      )}

      {/* Related Interests Component */}
      <RelatedInterests 
        currentSlug={interest.slug}
        limit={6}
        title="More Experiences You'll Love"
        subtitle="Explore other amazing categories and attractions"
      />

      {/* Popular Interests Grid Component */}
      <PopularInterestsGrid 
        limit={8}
        showFeaturedOnly={false}
        title="Popular Categories in Egypt"
        subtitle="Browse the most sought-after experiences"
        columns={4}
      />

      {/* CTA Section */}
      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to explore {interest.name}?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Book your perfect experience today and create unforgettable memories
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tours"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse All Experiences
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-red-600 transition-colors"
            >
              Get Help Planning
              <MessageCircle className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}