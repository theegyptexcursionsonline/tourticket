'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Users, Clock, MapPin } from 'lucide-react';
import { CategoryPageData, Tour } from '@/types';

interface AttractionPageTemplateProps {
  page: CategoryPageData;
  urlType: 'attraction' | 'category';
}

const TourCard = ({ tour }: { tour: Tour }) => {
  const destination = typeof tour.destination === 'object' ? tour.destination : null;
  
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {tour.isFeatured && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 text-xs font-semibold rounded">
            Featured
          </div>
        )}
        <div className="absolute bottom-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 text-sm rounded flex items-center gap-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          {tour.rating || 4.5}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">
          {tour.title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {tour.duration}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Max {tour.maxGroupSize || 15}
          </div>
        </div>
        
        {destination && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
            <MapPin className="w-4 h-4" />
            {destination.name}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-red-600">
              ${tour.discountPrice || tour.price}
            </span>
            {tour.originalPrice && tour.originalPrice > (tour.discountPrice || tour.price || 0) && (
              <span className="text-sm text-gray-500 line-through">
                ${tour.originalPrice}
              </span>
            )}
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ArrowRight className="w-5 h-5 text-red-600" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function AttractionPageTemplate({ page, urlType }: AttractionPageTemplateProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    7: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7',
    8: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8',
  };

  const gridClass = gridCols[page.itemsPerRow as keyof typeof gridCols] || gridCols[6];

  return (
    <main>
      {/* Hero Section */}
      <section 
        className="relative h-96 bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: `url(${page.heroImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {page.title}
          </h1>
          <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto">
            {page.description}
          </p>
          
          {/* Breadcrumb */}
          <nav className="flex items-center justify-center gap-2 text-sm opacity-80">
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <span className="capitalize">{urlType}</span>
            <span>/</span>
            <span>{page.title}</span>
          </nav>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          {/* Long Description */}
          {page.longDescription && (
            <div className="max-w-4xl mx-auto mb-12 text-center">
              <div className="prose prose-lg mx-auto">
                <p className="text-gray-700 leading-relaxed">
                  {page.longDescription}
                </p>
              </div>
            </div>
          )}

          {/* Highlights */}
          {page.highlights && page.highlights.length > 0 && (
            <div className="max-w-6xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-center mb-8">Highlights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {page.highlights.map((highlight, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-md text-center">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-6 h-6" />
                    </div>
                    <p className="text-gray-700">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {page.features && page.features.length > 0 && (
            <div className="max-w-4xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-center mb-8">What Makes This Special</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {page.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 bg-white p-6 rounded-lg shadow-md">
                    <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                    <p className="text-gray-700">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tours Grid Section */}
      {page.tours && page.tours.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            {/* Grid Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {page.gridTitle}
              </h2>
              {page.gridSubtitle && (
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  {page.gridSubtitle}
                </p>
              )}
            </div>

            {/* Tours Grid */}
            <div className={`grid ${gridClass} gap-6 mb-12`}>
              {page.tours.map((tour) => (
                <TourCard key={tour._id} tour={tour} />
              ))}
            </div>

            {/* Stats */}
            {page.showStats && (
              <div className="mt-16 text-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  <div className="bg-gray-50 rounded-lg shadow-md p-6">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {page.totalTours || page.tours.length}
                    </div>
                    <div className="text-gray-600 font-medium">
                      Tours Available
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg shadow-md p-6">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      4.8
                    </div>
                    <div className="text-gray-600 font-medium">
                      Average Rating
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg shadow-md p-6">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      24/7
                    </div>
                    <div className="text-gray-600 font-medium">
                      Customer Support
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Your Adventure?
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Browse our complete collection of tours and experiences to find your perfect adventure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Browse All Tours
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-red-600 transition-colors duration-200"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}