'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import Script from 'next/script';
import { ITour } from '@/lib/models/Tour';

interface VoiceAgentShowcaseClientProps {
  tour: ITour;
  reviews: any[];
  widgetConfig: {
    apiUrl: string;
    widgetId: string;
  };
}

export default function VoiceAgentShowcaseClient({ tour, reviews, widgetConfig }: VoiceAgentShowcaseClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'reviews'>('overview');

  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '4.9';

  return (
    <div className="pt-20">
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
              <span className="text-sky-300">{tour.title}</span>
            </nav>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-serif">
              {tour.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-sky-300 text-xl">★</span>
                <span className="font-semibold">{averageRating}</span>
                <span className="text-white/60">({reviews.length || '2,500+'} reviews)</span>
              </div>
              {tour.duration && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{tour.duration}</span>
                </div>
              )}
              {destination && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8">
              {(['overview', 'itinerary', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white text-sky-600 shadow-sm'
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
                            <span className="flex-shrink-0 w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center mt-0.5">
                              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                              <span className="text-sky-600 font-bold">{index + 1}</span>
                            </div>
                            {index < tour.itinerary!.length - 1 && (
                              <div className="w-px h-full bg-sky-200 mx-auto mt-2" />
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
                    <div className="flex items-center gap-2 text-sky-500">
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
                            <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
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

          {/* Right Column - Booking & Voice Help */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              {/* Price Header */}
              <div className="bg-white rounded-t-2xl border border-b-0 border-gray-200 p-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${tour.price || tour.discountPrice || 125}
                  </span>
                  <span className="text-gray-500">/ person</span>
                </div>
                <p className="text-gray-500 text-sm">Prices vary based on date and group size</p>
              </div>

              {/* Voice Assistant Info */}
              <div className="bg-white border-x border-gray-200 p-6 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Need Help?</h3>
                  <p className="text-sm text-gray-500">Talk to our AI voice assistant</p>
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-green-100 rounded-full text-green-700 text-xs font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Online — Ready to Talk
                  </div>
                </div>

                <div className="bg-sky-50 rounded-xl p-4 text-center">
                  <p className="text-sky-700 font-medium text-sm mb-2">You can ask things like:</p>
                  <div className="space-y-2">
                    {[
                      `"Tell me about this tour"`,
                      `"What's the price for 2 adults?"`,
                      `"Is there pickup from my hotel?"`,
                      `"What should I bring?"`,
                    ].map((q, i) => (
                      <p key={i} className="text-sky-600 text-sm italic">{q}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-gray-50 rounded-b-2xl border border-t-0 border-gray-200 p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Secure</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">24/7 Available</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">29+ Languages</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Foxes Voice Widget Script */}
      {widgetConfig.widgetId && (
        <Script
          src={`${widgetConfig.apiUrl}/widget.js`}
          strategy="lazyOnload"
          onLoad={() => {
            if (typeof window !== 'undefined' && (window as any).foxes) {
              (window as any).foxes('init', {
                widgetId: widgetConfig.widgetId,
                position: 'bottom-right',
                primaryColor: '#0ea5e9',
              });
            }
          }}
        />
      )}
    </div>
  );
}
