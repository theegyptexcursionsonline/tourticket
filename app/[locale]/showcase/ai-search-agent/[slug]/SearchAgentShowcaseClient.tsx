'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import Script from 'next/script';
import { ITour } from '@/lib/models/Tour';

interface SearchAgentShowcaseClientProps {
  tour: ITour;
  reviews: any[];
  widgetConfig: {
    apiUrl: string;
    apiKey: string;
  };
}

export default function SearchAgentShowcaseClient({ tour, reviews, widgetConfig }: SearchAgentShowcaseClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'reviews'>('overview');

  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '4.9';

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-[45vh] min-h-[350px] overflow-hidden">
        {tour.image && (
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-white/80 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              {destination && (
                <>
                  <Link href={`/destinations/${destination.slug}`} className="hover:text-white transition-colors">
                    {destination.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-violet-300">{tour.title}</span>
            </nav>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-serif">
              {tour.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-violet-300 text-xl">★</span>
                <span className="font-semibold">{averageRating}</span>
                <span className="text-white/60">({reviews.length || '2,500+'} reviews)</span>
              </div>
              {tour.duration && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{tour.duration}</span>
                </div>
              )}
              {destination && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span>{destination.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Left Column - Tour Info */}
          <div className="lg:col-span-3">
            {/* Price Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">Starting from</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    ${tour.price || tour.discountPrice || 125}
                  </span>
                  <span className="text-gray-500">/ person</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Free cancellation up to 24h before</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8">
              {(['overview', 'itinerary', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white text-violet-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Experience</h2>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {tour.description}
                    </p>
                  </div>

                  {tour.highlights && tour.highlights.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Highlights</h3>
                      <ul className="grid md:grid-cols-2 gap-4">
                        {tour.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center mt-0.5">
                              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className="text-gray-700">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {tour.includes && tour.includes.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">What&apos;s Included</h3>
                      <ul className="grid md:grid-cols-2 gap-3">
                        {tour.includes.map((item, index) => (
                          <li key={index} className="flex items-center gap-3 text-gray-700">
                            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {tour.whatsNotIncluded && tour.whatsNotIncluded.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Not Included</h3>
                      <ul className="grid md:grid-cols-2 gap-3">
                        {tour.whatsNotIncluded.map((item: string, index: number) => (
                          <li key={index} className="flex items-center gap-3 text-gray-500">
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'itinerary' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Itinerary</h2>
                  {tour.itinerary && tour.itinerary.length > 0 ? (
                    <div className="space-y-6">
                      {tour.itinerary.map((item: any, index: number) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                              <span className="text-violet-600 font-bold">{index + 1}</span>
                            </div>
                            {index < tour.itinerary!.length - 1 && (
                              <div className="w-px h-full bg-violet-200 mx-auto mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <h4 className="font-semibold text-gray-900 mb-2">
                              {item.time || item.title || `Step ${index + 1}`}
                            </h4>
                            <p className="text-gray-600">{item.description || item.activity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Detailed itinerary available upon booking.</p>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
                    <div className="flex items-center gap-2 text-violet-500">
                      <span className="text-2xl">★</span>
                      <span className="text-xl font-bold text-gray-900">{averageRating}</span>
                      <span className="text-gray-500">({reviews.length} reviews)</span>
                    </div>
                  </div>

                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review, index) => (
                        <div key={index} className="border-b border-gray-100 pb-6 last:border-0">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {review.user?.firstName?.[0] || 'G'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">
                                  {review.user?.firstName} {review.user?.lastName?.[0]}.
                                </h4>
                                <div className="flex items-center gap-1 text-yellow-500">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={i < (review.rating || 5) ? '' : 'opacity-30'}>★</span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-600 mt-2">{review.comment}</p>
                              {review.createdAt && (
                                <p className="text-gray-400 text-sm mt-2">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Be the first to review this experience!</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking & Help */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              {/* Quick Info Card */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-center text-white">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold">Need Help Deciding?</h3>
                  <p className="text-white/70 text-sm mt-1">Chat with our AI travel concierge</p>
                  <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Online — Ready to Chat
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="bg-violet-50 rounded-xl p-4 text-center">
                    <p className="text-violet-700 font-medium text-sm mb-2">You can ask things like:</p>
                    <div className="space-y-2">
                      {[
                        `"What's included in the price?"`,
                        `"Do you have similar tours?"`,
                        `"Best tours under $100?"`,
                        `"Is hotel pickup included?"`,
                      ].map((q, i) => (
                        <p key={i} className="text-violet-600 text-sm italic">{q}</p>
                      ))}
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-100">
                    <div>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Secure</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Instant</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">50+ Languages</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Foxes Search Widget Script */}
      {widgetConfig.apiKey && (
        <Script
          src={`${widgetConfig.apiUrl}/widget/foxes-widget.js`}
          strategy="lazyOnload"
          data-api-key={widgetConfig.apiKey}
          data-position="bottom-right"
          data-accent="#7c3aed"
          data-agent-name="Travel Concierge"
          data-greeting="Hi! I'm your AI travel concierge. Ask me anything about this tour or other experiences!"
          data-track-events="true"
        />
      )}
    </div>
  );
}
