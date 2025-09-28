'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Users, Clock, MapPin, Search, Filter, 
  Grid, List, Eye, Heart, Share2, Award, Calendar, 
  MessageCircle, ChevronDown, ChevronUp, Shield, CheckCircle,
  TrendingUp, Globe, Zap, Trophy, Target, Gift, Star,
  Phone, Mail, Navigation, Camera, Wifi, Coffee
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
    isFeatured: false,
    highlights: ['Exclusive Access', 'Photography Tour', 'Cultural Immersion'],
    tags: ['Exclusive', 'Premium'],
    destination: {
      name: 'Hidden Gem',
      slug: 'hidden-gem'
    },
    createdAt: new Date().toISOString()
  },
  {
    _id: 'mock-3',
    title: `${interestName} Group Experience`,
    slug: 'group-experience',
    description: `Perfect for groups and families, this ${interestName.toLowerCase()} tour offers fun activities and memorable moments for everyone.`,
    image: '/images/placeholder-tour-3.jpg',
    price: 149,
    discountPrice: 129,
    originalPrice: 149,
    duration: '1 Day',
    maxGroupSize: 20,
    isFeatured: false,
    highlights: ['Family Friendly', 'Group Discounts', 'Professional Photos'],
    tags: ['Family', 'Groups'],
    destination: {
      name: 'Family Destination',
      slug: 'family-destination'
    },
    createdAt: new Date().toISOString()
  },
  {
    _id: 'mock-4',
    title: `Private ${interestName} Tour`,
    slug: 'private-tour',
    description: `Enjoy a personalized ${interestName.toLowerCase()} experience with a private guide, customized to your interests and schedule.`,
    image: '/images/placeholder-tour-4.jpg',
    price: 499,
    discountPrice: 449,
    originalPrice: 499,
    duration: '4 Hours',
    maxGroupSize: 6,
    isFeatured: true,
    highlights: ['Private Guide', 'Customizable', 'VIP Access'],
    tags: ['Private', 'Luxury'],
    destination: {
      name: 'Exclusive Area',
      slug: 'exclusive-area'
    },
    createdAt: new Date().toISOString()
  }
];

// Mock related attractions
const createRelatedAttractions = (interestName: string) => [
  {
    _id: 'related-1',
    name: `Historic ${interestName} District`,
    slug: 'historic-district',
    image: '/images/placeholder-attraction-1.jpg',
    description: 'Explore the historic heart of the city',
    tourCount: 12
  },
  {
    _id: 'related-2',
    name: `${interestName} Cultural Center`,
    slug: 'cultural-center',
    image: '/images/placeholder-attraction-2.jpg',
    description: 'Immerse yourself in local culture',
    tourCount: 8
  },
  {
    _id: 'related-3',
    name: `${interestName} Adventure Park`,
    slug: 'adventure-park',
    image: '/images/placeholder-attraction-3.jpg',
    description: 'Thrilling outdoor activities',
    tourCount: 15
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
          
          {/* Featured Badge */}
          {tour.isFeatured && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded">
              Bestseller
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute bottom-3 right-3 bg-white px-2 py-1 rounded shadow-lg">
            <div className="text-sm font-bold text-gray-900">
              {formatPrice(tour.discountPrice || tour.price || 0)}
            </div>
          </div>

          {/* Wishlist Button */}
          <button className="absolute top-3 right-3 bg-white/80 p-1.5 rounded-full text-gray-600 hover:text-red-500 hover:bg-white transition-all duration-200">
            <Heart className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-base mb-2 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">
            {tour.title}
          </h3>
          
          {/* Tour Details */}
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
          
          {/* Destination */}
          {destination && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>{destination.name}</span>
            </div>
          )}
          
          {/* Highlights */}
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

          {/* Pricing */}
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

const SearchAndFilter = ({ 
  searchQuery, 
  setSearchQuery, 
  sortBy,
  setSortBy,
  selectedDuration,
  setSelectedDuration,
  priceRange,
  setPriceRange
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedDuration: string;
  setSelectedDuration: (duration: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
}) => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search experiences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* Duration Filter */}
      <select
        value={selectedDuration}
        onChange={(e) => setSelectedDuration(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
      >
        <option value="">All Durations</option>
        <option value="1 Day">1 Day</option>
        <option value="2 Days">2 Days</option>
        <option value="3 Days">3+ Days</option>
      </select>

      {/* Price Filter */}
      <select
        value={priceRange}
        onChange={(e) => setPriceRange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
      >
        <option value="">All Prices</option>
        <option value="0-100">$0 - $100</option>
        <option value="100-300">$100 - $300</option>
        <option value="300+">$300+</option>
      </select>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
      >
        <option value="recommended">Recommended</option>
        <option value="price_low">Price: Low to High</option>
        <option value="price_high">Price: High to Low</option>
        <option value="duration">Duration</option>
        <option value="newest">Newest</option>
      </select>
    </div>
  </div>
);

const ReviewsSection = ({ reviews }: { reviews: Review[] }) => {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((review, index) => (
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

const RelatedAttractionsSection = ({ interestName }: { interestName: string }) => {
  const relatedAttractions = createRelatedAttractions(interestName);

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Attractions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {relatedAttractions.map((attraction, index) => (
            <Link
              key={attraction._id}
              href={`/attraction/${attraction.slug}`}
              className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 border border-gray-200"
            >
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={attraction.image}
                  alt={attraction.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 group-hover:text-red-600 transition-colors">
                  {attraction.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3">{attraction.description}</p>
                <div className="text-sm text-gray-500">
                  {attraction.tourCount} experiences available
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const AboutSection = ({ interest }: { interest: InterestData }) => (
  <section className="py-12 bg-gray-50">
    <div className="container mx-auto px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">About {interest.name}</h2>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 leading-relaxed mb-6">
            {interest.longDescription || interest.description}
          </p>
          
          {interest.highlights && interest.highlights.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">What Makes This Special</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {interest.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Essential Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Flexible durations available</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Small to large groups</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Fully insured experiences</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Photo opportunities included</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Expert local guides</span>
                </div>
                <div className="flex items-center gap-3">
                  <Navigation className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Easy meeting points</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default function InterestLandingPage({ interest }: InterestLandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [priceRange, setPriceRange] = useState('');

  // Use mock tours if no real tours available
  const availableTours = (interest.tours && interest.tours.length > 0) 
    ? interest.tours 
    : createMockTours(interest.name);

  // Filter and sort tours
  const filteredAndSortedTours = React.useMemo(() => {
    let filtered = availableTours.filter(tour => {
      // Search filter
      if (searchQuery && !tour.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !tour.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Duration filter
      if (selectedDuration && !tour.duration.includes(selectedDuration.split(' ')[0])) {
        return false;
      }

      // Price filter
      if (priceRange) {
        const price = tour.discountPrice || tour.price || 0;
        if (priceRange === '0-100' && price > 100) return false;
        if (priceRange === '100-300' && (price < 100 || price > 300)) return false;
        if (priceRange === '300+' && price < 300) return false;
      }

      return true;
    });

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
      default: // recommended
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });
    }

    return filtered;
  }, [availableTours, searchQuery, sortBy, selectedDuration, priceRange]);

  return (
    <main className="min-h-screen bg-white">
      {/* Simplified Hero Section */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={interest.heroImage}
            alt={interest.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-6">
            <div className="text-white max-w-4xl">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                {interest.name}
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl">
                {interest.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tours Section - Immediately after Hero */}
      <section className="py-8">
        <div className="container mx-auto px-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Things to do in {interest.name}
            </h2>
            <p className="text-gray-600">
              {filteredAndSortedTours.length} experiences found
            </p>
          </div>

          {/* Search and Filter */}
          <SearchAndFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
          />

          {/* Tours Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedTours.map((tour, index) => (
              <TourCard key={tour._id} tour={tour} index={index} />
            ))}
          </div>

          {filteredAndSortedTours.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No experiences found matching your criteria.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDuration('');
                  setPriceRange('');
                }}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <AboutSection interest={interest} />

      {/* Reviews Section */}
      {interest.reviews && interest.reviews.length > 0 && (
        <ReviewsSection reviews={interest.reviews} />
      )}

      {/* Related Attractions */}
      <RelatedAttractionsSection interestName={interest.name} />

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
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse All Experiences
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-red-600 transition-colors"
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