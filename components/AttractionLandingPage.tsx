// components/AttractionLandingPage.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Star, Users, Clock, MapPin, Search, Filter, 
  Grid, List, Eye, Heart, Share2, Award, Calendar, 
  MessageCircle, ChevronDown, ChevronUp, Shield, CheckCircle,
  TrendingUp, Globe, Zap, Trophy, Target, Gift, Info, X
} from 'lucide-react';
import { Tour, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import TourCard from '@/components/shared/TourCard';
import RelatedInterests from '@/components/RelatedInterests';
import PopularInterestsGrid from '@/components/PopularInterestsGrid';

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

const ImageGallery = ({ images, title }: { images: string[], title: string }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {images.slice(0, 5).map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(image)}
            className="relative aspect-video rounded-lg overflow-hidden hover:opacity-75 transition-opacity"
          >
            <Image
              src={image}
              alt={`${title} - Image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 25vw, 200px"
            />
            {index === 4 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                +{images.length - 5}
              </div>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-slate-300"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
              <Image
                src={selectedImage}
                alt={title}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const StatsBar = ({ attraction }: { attraction: AttractionData }) => {
  // Calculate real average rating from reviews
  const avgRating = attraction.reviews && attraction.reviews.length > 0
    ? (attraction.reviews.reduce((sum, review) => sum + review.rating, 0) / attraction.reviews.length).toFixed(1)
    : null;
  
  const totalReviews = attraction.reviews?.length || 0;
  const totalActivities = attraction.totalTours || attraction.tours?.length || 0;

  return (
    <div className="bg-white border-y border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          {avgRating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{avgRating}</span>
              </div>
              <span className="text-slate-600 text-sm">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}
          
          {totalActivities > 0 && (
            <>
              <div className="hidden sm:block h-6 w-px bg-slate-300" />
              <div className="flex items-center gap-2 text-slate-700">
                <Target className="w-5 h-5 text-red-600" />
                <span className="font-semibold">{totalActivities}</span>
                <span className="text-slate-600">activities</span>
              </div>
            </>
          )}
          
          <div className="hidden md:block h-6 w-px bg-slate-300" />
          <div className="hidden md:flex items-center gap-2 text-slate-700">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">Free cancellation available</span>
          </div>
          
          <div className="hidden md:block h-6 w-px bg-slate-300" />
          <div className="hidden md:flex items-center gap-2 text-slate-700">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Instant confirmation</span>
          </div>
          
          <div className="ml-auto flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Share2 className="w-5 h-5 text-slate-600" />
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Heart className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchAndFilter = ({ 
  searchQuery, 
  setSearchQuery, 
  sortBy,
  setSortBy,
  totalResults
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  totalResults: number;
}) => (
  <div className="mb-8">
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {totalResults} {totalResults === 1 ? 'activity' : 'activities'} available
        </h2>
        <p className="text-slate-600 mt-1">Book your perfect experience</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div className="relative flex-1 md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
        >
          <option value="featured">Most popular</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating">Top rated</option>
          <option value="duration">Duration</option>
          <option value="newest">Newest</option>
        </select>
      </div>
    </div>
  </div>
);

const ReviewsSection = ({ reviews }: { reviews: Review[] }) => {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 8);

  if (!reviews || reviews.length === 0) return null;

  // Calculate real statistics
  const avgRating = (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: (reviews.filter(r => r.rating === star).length / reviews.length) * 100
  }));

  return (
    <section className="py-16 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Rating Overview */}
          <div className="lg:col-span-1">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Guest reviews
            </h2>
            
            <div className="bg-white rounded-xl p-8 border border-slate-200 sticky top-24">
              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-slate-900 mb-2">{avgRating}</div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(Number(avgRating)) ? 'text-yellow-400 fill-current' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-slate-600">
                  Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              <div className="space-y-3">
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 w-8">{star} ★</span>
                    <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-600 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedReviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-white p-6 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                        {review.userName ? review.userName.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{review.userName || 'Anonymous'}</h4>
                        <div className="flex items-center gap-1 mt-1">
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
                  </div>
                  
                  {review.title && (
                    <h5 className="font-semibold text-slate-800 mb-2">{review.title}</h5>
                  )}
                  
                  <p className="text-slate-600 text-sm leading-relaxed mb-3">
                    {review.comment}
                  </p>
                  
                  <div className="text-xs text-slate-500">
                    {new Date(review.createdAt || review.date || '').toLocaleDateString('en-US', { 
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              ))}
            </div>

            {reviews.length > 8 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all"
                >
                  {showAllReviews ? (
                    <>
                      Show less
                      <ChevronUp className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Show all {reviews.length} reviews
                      <ChevronDown className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const AttractionLandingPage: React.FC<AttractionLandingPageProps> = ({ attraction }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  const filteredAndSortedTours = useMemo(() => {
    let filtered = attraction.tours?.filter(tour =>
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

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
      default:
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
    }

    return filtered;
  }, [attraction.tours, searchQuery, sortBy]);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-slate-900">
        <div className="absolute inset-0">
          <Image
            src={attraction.heroImage}
            alt={attraction.title}
            fill
            className="object-cover opacity-50"
            priority
            sizes="100vw"
          />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {attraction.title}
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-3xl">
              {attraction.description}
            </p>

            <div className="flex flex-wrap gap-4">
              
                href="#activities"
                className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
              >
                Explore activities
                <ArrowRight className="w-5 h-5" />
              </a>
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/20 transition-all">
                <MapPin className="w-5 h-5" />
                View on map
              </button>
            </div>
          </motion.div>

          {/* Image Gallery */}
          {attraction.images && attraction.images.length > 0 && (
            <ImageGallery images={attraction.images} title={attraction.title} />
          )}
        </div>
      </section>

      {/* Stats Bar */}
      <StatsBar attraction={attraction} />

      {/* About Section */}
      {attraction.longDescription && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                About {attraction.title}
              </h2>
              <div className="prose prose-lg max-w-none text-slate-700 leading-relaxed">
                <p>{attraction.longDescription}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Highlights Section */}
      {attraction.highlights && attraction.highlights.length > 0 && (
        <section className="py-16 bg-slate-50">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Highlights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {attraction.highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 bg-white p-6 rounded-xl border border-slate-200 hover:border-red-300 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <p className="text-slate-700 leading-relaxed">{highlight}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {attraction.features && attraction.features.length > 0 && (
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              What to expect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
              {attraction.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="text-slate-700 leading-relaxed pt-0.5">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Activities Section */}
      {attraction.tours && attraction.tours.length > 0 && (
        <section id="activities" className="py-16 bg-slate-50">
          <div className="container mx-auto px-6">
            <SearchAndFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              totalResults={filteredAndSortedTours.length}
            />

            {filteredAndSortedTours.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedTours.map((tour, index) => (
                  <TourCard key={tour._id} tour={tour} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No activities found</h3>
                <p className="text-slate-500 mb-6">
                  {searchQuery ? 'Try different search terms' : 'Check back soon for new activities'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-red-600 font-semibold hover:text-red-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* No Activities Available */}
      {(!attraction.tours || attraction.tours.length === 0) && (
        <section id="activities" className="py-20 bg-slate-50">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-12 border border-slate-200">
              <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Activities coming soon
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                We're working on adding exciting activities for {attraction.title}. Check back soon!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/tours"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
                >
                  Browse all tours
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-8 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Contact us
                  <MessageCircle className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {attraction.reviews && attraction.reviews.length > 0 && (
        <ReviewsSection reviews={attraction.reviews} />
      )}

      {/* Related Interests */}
      <div className="bg-white border-t border-slate-200">
        <RelatedInterests 
          currentSlug={attraction.slug}
          limit={8}
          title="You might also like"
          subtitle="Discover similar attractions and experiences"
        />
      </div>

      {/* Popular Interests */}
      <PopularInterestsGrid 
        limit={8}
        showFeaturedOnly={true}
        title="Popular categories"
        subtitle="Browse top experiences by category"
        columns={4}
      />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-red-600 to-red-700 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start your adventure in {attraction.title}
            </h2>
            <p className="text-lg mb-8 text-white/90">
              Book unforgettable experiences with free cancellation and instant confirmation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              
                href="#activities"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-red-600 font-semibold rounded-lg hover:bg-slate-100 transition-all shadow-lg"
              >
                View all activities
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
              >
                Get help planning
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