'use client';

import React, { useState, useMemo } from 'react';
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
import TourCard from '@/components/shared/TourCard';

interface AttractionData {
  _id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  heroImage: string;
  images?: string[];
  highlights?: string[];
  features?: string[];
  tours: Tour[];
  totalTours: number;
  reviews: Review[];
  gridTitle: string;
  gridSubtitle?: string;
  showStats: boolean;
  isPublished: boolean;
  featured: boolean;
}

interface AttractionLandingPageProps {
  attraction: AttractionData;
}

const StatsSection = ({ attraction }: { attraction: AttractionData }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto"
  >
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300 border border-slate-100">
      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4">
        <Target className="w-6 h-6" />
      </div>
      <div className="text-3xl font-black text-slate-900 mb-2">
        {attraction.totalTours}
      </div>
      <div className="text-slate-600 font-semibold text-sm">
        Available Tours
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300 border border-slate-100">
      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4">
        <MessageCircle className="w-6 h-6" />
      </div>
      <div className="text-3xl font-black text-slate-900 mb-2">
        {attraction.reviews?.length || 0}
      </div>
      <div className="text-slate-600 font-semibold text-sm">
        Customer Reviews
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300 border border-slate-100">
      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4">
        <Star className="w-6 h-6 fill-current" />
      </div>
      <div className="text-3xl font-black text-slate-900 mb-2">
        4.8
      </div>
      <div className="text-slate-600 font-semibold text-sm">
        Average Rating
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300 border border-slate-100">
      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4">
        <Trophy className="w-6 h-6" />
      </div>
      <div className="text-3xl font-black text-slate-900 mb-2">
        {Math.floor(Math.random() * 1000) + 500}
      </div>
      <div className="text-slate-600 font-semibold text-sm">
        Happy Customers
      </div>
    </div>
  </motion.div>
);

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
        <option value="rating">Highest Rated</option>
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
            Real experiences from travelers who have visited this attraction
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
                {new Date(review.createdAt || review.date || '').toLocaleDateString()}
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

const AttractionLandingPage: React.FC<AttractionLandingPageProps> = ({ attraction }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('featured');

  // Filter and sort tours
  const filteredAndSortedTours = useMemo(() => {
    let filtered = attraction.tours?.filter(tour =>
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Sort tours
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
          return (b.rating || 0) - (a.rating || 0);
        });
    }

    return filtered;
  }, [attraction.tours, searchQuery, sortBy]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50">
      {/* Hero Section */}
      <section className="relative h-[80vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={attraction.heroImage}
            alt={attraction.title}
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
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>Featured Attraction Experience</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
                {attraction.title}
              </h1>
              
              <p className="text-xl md:text-2xl font-medium max-w-4xl mx-auto leading-relaxed opacity-90">
                {attraction.longDescription || attraction.description}
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
                  Learn More
                  <Eye className="w-5 h-5" />
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm opacity-90">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span>Verified Attraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>Top Rated Experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Expert Guides Available</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {attraction.showStats && (
        <section className="py-16 -mt-20 relative z-10">
          <div className="container mx-auto px-6">
            <StatsSection attraction={attraction} />
          </div>
        </section>
      )}

      {/* Highlights Section */}
      {attraction.highlights && attraction.highlights.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Why Visit {attraction.title}?
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Discover what makes this attraction truly special
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {attraction.highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow duration-300 border border-slate-100"
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">{highlight}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {attraction.features && attraction.features.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                What Makes This Experience Special
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Comprehensive features designed for your perfect visit
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {attraction.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-6 bg-slate-50 p-8 rounded-2xl hover:bg-white hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold">{index + 1}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-lg">{feature}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tours Section */}
      {attraction.tours && attraction.tours.length > 0 && (
        <section id="tours" className="py-16 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-slate-900 mb-6"
              >
                {attraction.gridTitle}
              </motion.h2>
              {attraction.gridSubtitle && (
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-slate-600 max-w-3xl mx-auto"
                >
                  {attraction.gridSubtitle}
                </motion.p>
              )}
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
                Showing <span className="font-semibold text-slate-900">{filteredAndSortedTours.length}</span> of{' '}
                <span className="font-semibold text-slate-900">{attraction.tours.length}</span> tours
              </p>
            </div>

            {/* Tours Grid */}
            {filteredAndSortedTours.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredAndSortedTours.map((tour, index) => (
                  <TourCard key={tour._id} tour={tour} index={index} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No tours found</h3>
                <p className="text-slate-500 mb-6">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'No tours are currently available for this attraction.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* No Tours Available Message */}
      {(!attraction.tours || attraction.tours.length === 0) && (
        <section className="py-20">
          <div className="container mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="w-32 h-32 mx-auto mb-8 bg-slate-100 rounded-full flex items-center justify-center">
                <Calendar className="w-16 h-16 text-slate-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Tours Coming Soon
              </h2>
              <p className="text-xl text-slate-600 mb-8">
                We're working on adding tours for this amazing attraction. 
                Check back soon for exciting experiences!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/tours"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Browse All Tours
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-8 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Contact Us
                  <MessageCircle className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {attraction.reviews && attraction.reviews.length > 0 && (
        <ReviewsSection reviews={attraction.reviews} />
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
              Ready to Experience {attraction.title}?
            </h2>
            <p className="text-xl mb-10 opacity-90 leading-relaxed">
              Book your unforgettable adventure today and create memories that will last a lifetime.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/tours"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-slate-100 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Book Your Tour
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
};

export default AttractionLandingPage;