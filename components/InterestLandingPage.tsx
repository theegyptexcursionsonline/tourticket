'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Star, Users, Clock, MapPin, Search, Filter, 
  Grid, List, Eye, Heart, Share2, Award, Calendar, 
  MessageCircle, ChevronDown, ChevronUp, Shield, CheckCircle,
  TrendingUp, Globe, Zap, Trophy, Target, Gift
} from 'lucide-react';
import { Tour, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';

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

// Mock tours for when no tours are available
const createMockTours = (interestName: string): Tour[] => [
  {
    _id: 'mock-1',
    title: `Ultimate ${interestName} Adventure`,
    slug: 'ultimate-adventure',
    description: `Experience the best of ${interestName.toLowerCase()} with our comprehensive tour that covers all the must-see highlights and hidden gems.`,
    image: '/images/placeholder-tour-1.jpg',
    price: 299,
    discountPrice: 249,
    originalPrice: 299,
    duration: '3 Days',
    maxGroupSize: 12,
    rating: 4.8,
    isFeatured: true,
    highlights: ['Expert Local Guide', 'Small Group Experience', 'All Meals Included'],
    tags: ['Popular', 'Best Value'],
    destination: {
      name: 'Premium Location',
      slug: 'premium-location'
    },
    createdAt: new Date().toISOString()
  },
  {
    _id: 'mock-2',
    title: `Exclusive ${interestName} Discovery`,
    slug: 'exclusive-discovery',
    description: `Discover the hidden secrets of ${interestName.toLowerCase()} with our exclusive access tours and personalized experiences.`,
    image: '/images/placeholder-tour-2.jpg',
    price: 199,
    discountPrice: 179,
    originalPrice: 199,
    duration: '2 Days',
    maxGroupSize: 8,
    rating: 4.9,
    isFeatured: false,
    highlights: ['Exclusive Access', 'Photography Tour', 'Cultural Immersion'],
    tags: ['Exclusive', 'Premium'],
    destination: {
      name: 'Hidden Gem',
      slug: 'hidden-gem'
    },
    createdAt: new Date().toISOString()
  }
];

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
        className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 block"
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Featured Badge */}
          {tour.isFeatured && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg">
              Featured
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg">
            <div className="text-lg font-bold text-slate-900">
              {formatPrice(tour.discountPrice || tour.price || 0)}
            </div>
            {tour.originalPrice && tour.originalPrice > (tour.discountPrice || tour.price || 0) && (
              <div className="text-xs text-slate-500 line-through text-center">
                {formatPrice(tour.originalPrice)}
              </div>
            )}
          </div>

          {/* Wishlist Button */}
          <button className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm p-2 rounded-full text-slate-600 hover:text-red-500 hover:bg-white transition-all duration-200 opacity-0 group-hover:opacity-100">
            <Heart className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="font-bold text-lg mb-3 group-hover:text-red-600 transition-colors duration-200 line-clamp-2 leading-tight">
            {tour.title}
          </h3>
          
          {/* Tour Details */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{tour.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Max {tour.maxGroupSize || 15}</span>
            </div>
          </div>
          
          {/* Destination */}
          {destination && (
            <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>{destination.name}</span>
            </div>
          )}

          {/* Description */}
          <p className="text-slate-600 text-sm line-clamp-2 mb-4">
            {tour.description}
          </p>
          
          {/* Highlights */}
          {tour.highlights && tour.highlights.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {tour.highlights.slice(0, 2).map((highlight, i) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium"
                  >
                    {highlight.length > 20 ? highlight.substring(0, 20) + '...' : highlight}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {tour.tags?.slice(0, 1).map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              <ArrowRight className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const SearchAndFilter = ({ 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode,
  sortBy,
  setSortBy
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
    <div className="flex flex-col md:flex-row items-center gap-4">
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search tours..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
      >
        <option value="featured">Featured First</option>
        <option value="price_low">Price: Low to High</option>
        <option value="price_high">Price: High to Low</option>
        <option value="duration">Duration</option>
        <option value="newest">Newest First</option>
      </select>

      {/* View Toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-3 rounded-lg transition-all duration-200 ${
            viewMode === 'grid' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Grid className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-3 rounded-lg transition-all duration-200 ${
            viewMode === 'list' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
);

const ReviewsSection = ({ reviews }: { reviews: Review[] }) => {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 6);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-r from-slate-50 to-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-slate-600">
            Real experiences from travelers who have booked with us
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {displayedReviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-100"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {review.userName ? review.userName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-slate-900">{review.userName || 'Anonymous'}</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {review.title && (
                <h5 className="font-semibold text-slate-800 mb-2">{review.title}</h5>
              )}
              
              <p className="text-slate-600 text-sm leading-relaxed mb-3 line-clamp-4">
                {review.comment}
              </p>
              
              <div className="text-xs text-slate-500">
                {new Date(review.createdAt || review.date).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>

        {reviews.length > 6 && (
          <div className="text-center">
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors duration-200"
            >
              {showAllReviews ? (
                <>
                  Show Less
                  <ChevronUp className="w-5 h-5" />
                </>
              ) : (
                <>
                  View All {reviews.length} Reviews
                  <ChevronDown className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default function InterestLandingPage({ interest }: InterestLandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('featured');

  // Use mock tours if no real tours available
  const availableTours = (interest.tours && interest.tours.length > 0) 
    ? interest.tours 
    : createMockTours(interest.name);

  // Filter and sort tours
  const filteredAndSortedTours = React.useMemo(() => {
    let filtered = availableTours.filter(tour =>
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort tours
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0));
        break;
      case 'duration':
        filtered.sort((a, b) => a.duration.localeCompare(b.duration));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        break;
      default: // featured
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });
    }

    return filtered;
  }, [availableTours, searchQuery, sortBy]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50">
      {/* Enhanced Hero Section */}
      <section className="relative h-[80vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={interest.heroImage}
            alt={interest.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        </div>
        
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center text-white max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 text-sm font-medium">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Premium Travel Experience</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
                {interest.name} <span className="text-yellow-400">Tours</span>
              </h1>
              
              <p className="text-xl md:text-2xl font-medium max-w-4xl mx-auto leading-relaxed opacity-90">
                {interest.longDescription || interest.description}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="#tours"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Explore Tours
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="inline-flex items-center gap-3 px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-slate-900 transition-all duration-200 transform hover:scale-105">
                  Watch Video
                  <Eye className="w-5 h-5" />
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm opacity-90">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span>Fully Licensed & Insured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>Award-Winning Service</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Expert Local Guides</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tours Section - Directly after Hero */}
      <section id="tours" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-bold text-slate-900 mb-6"
            >
              Available {interest.name} Tours
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-slate-600 max-w-3xl mx-auto"
            >
              Choose from our carefully selected collection of {interest.name.toLowerCase()} experiences
            </motion.p>
          </div>

          {/* Search and Filter */}
          <SearchAndFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          {/* Results Count */}
          <div className="text-center mb-8">
            <p className="text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredAndSortedTours.length}</span> tours
              {(!interest.tours || interest.tours.length === 0) && (
                <span className="text-red-600 font-medium ml-2">(Coming Soon)</span>
              )}
            </p>
          </div>

          {/* Tours Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredAndSortedTours.map((tour, index) => (
              <TourCard key={tour._id} tour={tour} index={index} />
            ))}
          </div>

          {/* Mock Tours Notice */}
          {(!interest.tours || interest.tours.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-12 p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                More Tours Coming Soon!
              </h3>
              <p className="text-slate-600 mb-6">
                We're currently adding more amazing {interest.name.toLowerCase()} tours to our collection. 
                The tours shown above are sample experiences - contact us for current availability and custom options.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Contact Us for Custom Tours
                  <MessageCircle className="w-5 h-5" />
                </Link>
                <Link
                  href="/tours"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Browse All Tours
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      {interest.reviews && interest.reviews.length > 0 && (
        <ReviewsSection reviews={interest.reviews} />
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready for Your {interest.name} Adventure?
            </h2>
            <p className="text-xl mb-10 opacity-90 leading-relaxed">
              Join thousands of travelers who have discovered unforgettable {interest.name.toLowerCase()} experiences with us. 
              Your perfect adventure awaits!
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/tours"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-slate-100 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Browse All Tours
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-red-600 transition-all duration-200 transform hover:scale-105"
              >
                Get Expert Advice
                <Users className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}