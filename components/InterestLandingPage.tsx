'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  MapPin,
  Clock,
  Users,
  Heart,
  Share2,
  Filter,
  Grid,
  List,
  ChevronRight,
  Calendar,
  Award,
  Camera,
  TrendingUp,
  ArrowRight,
  Eye,
  ThumbsUp
} from 'lucide-react';

interface Tour {
  _id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  rating: number;
  reviewCount: number;
  image: string;
  location: string;
}

interface AttractionPage {
  _id: string;
  title: string;
  slug: string;
  description: string;
  heroImage: string;
  pageType: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

interface InterestData {
  name: string;
  slug: string;
  description: string;
  tours: Tour[];
  attractionPages: AttractionPage[];
  categories: Category[];
  relatedCategories: Category[];
  stats: {
    totalTours: number;
    totalAttractions: number;
    averageRating: number;
    totalReviews: number;
  };
}

interface InterestLandingPageProps {
  interest: InterestData;
}

// Hero Section Component
const HeroSection = ({ interest }: { interest: InterestData }) => (
  <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-24 overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
    </div>

    <div className="container mx-auto px-4 relative">
      <div className="max-w-4xl mx-auto text-center text-white">
        {/* Breadcrumb */}
        <nav className="flex items-center justify-center gap-2 text-blue-200 mb-8">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/interests" className="hover:text-white transition-colors">Interests</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">{interest.name}</span>
        </nav>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
          {interest.name} Tours
        </h1>
        
        <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
          {interest.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold">{interest.stats.totalTours}</div>
            <div className="text-blue-200">Available Tours</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold">{interest.stats.averageRating}</div>
            <div className="text-blue-200">Average Rating</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold">{interest.stats.totalReviews}</div>
            <div className="text-blue-200">Happy Travelers</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold">{interest.stats.totalAttractions}</div>
            <div className="text-blue-200">Attractions</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
            Explore All Tours
          </button>
          <button className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300">
            View Attractions
          </button>
        </div>
      </div>
    </div>
  </section>
);

// Featured Tours Section
const FeaturedToursSection = ({ tours }: { tours: Tour[] }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Featured Tours</h2>
            <p className="text-slate-600 text-lg">Handpicked experiences just for you</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Tours Grid */}
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {tours.map((tour) => (
            <TourCard key={tour._id} tour={tour} viewMode={viewMode} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Load More Tours
          </button>
        </div>
      </div>
    </section>
  );
};

// Tour Card Component
const TourCard = ({ tour, viewMode }: { tour: Tour; viewMode: 'grid' | 'list' }) => (
  <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${
    viewMode === 'list' ? 'flex flex-row' : 'flex flex-col'
  }`}>
    {/* Image */}
    <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-1/3' : 'h-48'}`}>
      <Image
        src={tour.image}
        alt={tour.title}
        fill
        className="object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div className="absolute top-4 right-4 flex gap-2">
        <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
          <Heart className="w-4 h-4 text-slate-600" />
        </button>
        <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
          <Share2 className="w-4 h-4 text-slate-600" />
        </button>
      </div>
      <div className="absolute bottom-4 left-4">
        <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
          ${tour.price}
        </span>
      </div>
    </div>

    {/* Content */}
    <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
          {tour.title}
        </h3>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-semibold">{tour.rating}</span>
          <span className="text-sm text-slate-500">({tour.reviewCount})</span>
        </div>
      </div>

      <p className="text-slate-600 mb-4 line-clamp-2">{tour.description}</p>

      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {tour.duration}
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {tour.location}
        </div>
      </div>

      <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105">
        Book Now
      </button>
    </div>
  </div>
);

// Attraction Pages Section
const AttractionPagesSection = ({ attractionPages }: { attractionPages: AttractionPage[] }) => (
  <section className="py-20 bg-white">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">Related Attractions</h2>
        <p className="text-slate-600 text-lg">Discover more amazing places and experiences</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {attractionPages.map((attraction) => (
          <Link
            key={attraction._id}
            href={`/attraction/${attraction.slug}`}
            className="group block bg-gradient-to-br from-slate-100 to-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
          >
            <div className="relative h-48 overflow-hidden">
              <Image
                src={attraction.heroImage}
                alt={attraction.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-white mb-2">{attraction.title}</h3>
                <p className="text-white/80 text-sm line-clamp-2">{attraction.description}</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                  {attraction.pageType}
                </span>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

// Related Categories Section
const RelatedCategoriesSection = ({ categories }: { categories: Category[] }) => (
  <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">Explore More Categories</h2>
        <p className="text-slate-600 text-lg">Find your next adventure</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category._id}
            href={`/interests/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {category.name}
            </h3>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

// Reviews Section
const ReviewsSection = ({ interest }: { interest: InterestData }) => {
  const mockReviews = [
    {
      id: 1,
      name: 'Sarah Johnson',
      rating: 5,
      comment: `Amazing ${interest.name.toLowerCase()} experience! Highly recommended.`,
      date: '2024-01-15',
      avatar: '/images/avatar-placeholder.jpg'
    },
    {
      id: 2,
      name: 'Mohammed Ali',
      rating: 4,
      comment: 'Great tours and excellent guides. Will definitely book again.',
      date: '2024-01-10',
      avatar: '/images/avatar-placeholder.jpg'
    },
    {
      id: 3,
      name: 'Emma Wilson',
      rating: 5,
      comment: 'Unforgettable memories! The best tour experience in Egypt.',
      date: '2024-01-05',
      avatar: '/images/avatar-placeholder.jpg'
    }
  ];

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">What Travelers Say</h2>
          <p className="text-slate-300 text-lg">Real reviews from real travelers</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {mockReviews.map((review) => (
            <div key={review.id} className="bg-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-semibold">{review.name}</h4>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-300 mb-4">{review.comment}</p>
              <div className="text-sm text-slate-500">{review.date}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
            Read All Reviews
          </button>
        </div>
      </div>
    </section>
  );
};

// Main Component
export default function InterestLandingPage({ interest }: InterestLandingPageProps) {
  return (
    <div className="min-h-screen">
      <HeroSection interest={interest} />
      <FeaturedToursSection tours={interest.tours} />
      <AttractionPagesSection attractionPages={interest.attractionPages} />
      <RelatedCategoriesSection categories={interest.relatedCategories} />
      <ReviewsSection interest={interest} />
    </div>
  );
}