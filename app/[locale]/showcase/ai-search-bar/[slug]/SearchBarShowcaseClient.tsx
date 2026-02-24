'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { ITour } from '@/lib/models/Tour';

interface SearchBarShowcaseClientProps {
  tour: ITour;
  reviews: any[];
  widgetConfig: { apiUrl: string; apiKey: string };
}

export default function SearchBarShowcaseClient({ tour, reviews, widgetConfig }: SearchBarShowcaseClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'reviews'>('overview');
  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : '4.9';

  useEffect(() => {
    if (!widgetConfig.apiKey) return;
    const scriptId = 'foxes-search-bar-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${widgetConfig.apiUrl}/widget/foxes-search-widget.js`;
    script.async = true;
    script.setAttribute('data-api-key', widgetConfig.apiKey);
    script.setAttribute('data-container', 'foxes-search-bar');
    script.setAttribute('data-accent', '#0891b2');
    script.setAttribute('data-agent-name', 'Travel Concierge');
    script.setAttribute('data-greeting', 'Search for tours, ask questions, or get personalized recommendations.');
    script.setAttribute('data-placeholder', 'Search tours, ask about Egypt...');
    script.setAttribute('data-track-events', 'true');

    document.body.appendChild(script);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      const container = document.getElementById('foxes-search-bar');
      if (container) container.innerHTML = '';
    };
  }, [widgetConfig.apiKey, widgetConfig.apiUrl]);

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative h-[35vh] min-h-[280px] overflow-hidden">
        {tour.image && <Image src={tour.image} alt={tour.title} fill className="object-cover" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-7xl mx-auto">
            <nav className="flex items-center gap-2 text-white/80 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              {destination && (<><Link href={`/destinations/${destination.slug}`} className="hover:text-white transition-colors">{destination.name}</Link><span>/</span></>)}
              <span className="text-cyan-300">{tour.title}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-serif">{tour.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 text-xl">★</span>
                <span className="font-semibold">{averageRating}</span>
                <span className="text-white/60">({reviews.length || '2,500+'} reviews)</span>
              </div>
              {tour.duration && (<div className="flex items-center gap-2"><svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{tour.duration}</span></div>)}
              {destination && (<div className="flex items-center gap-2"><svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg><span>{destination.name}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar — sticky at bottom of viewport */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div id="foxes-search-bar" className="bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-cyan-100">
          {!widgetConfig.apiKey && (
            <div className="flex items-center justify-center py-4 bg-cyan-50">
              <p className="text-cyan-600 text-sm">Search bar loading...</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content — add bottom padding for sticky search bar */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 pb-24">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">Starting from</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">${tour.price || tour.discountPrice || 125}</span>
                  <span className="text-gray-500">/ person</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <span>Free cancellation up to 24h before</span>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8">
              {(['overview', 'itinerary', 'reviews'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === tab ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Experience</h2>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{tour.description}</p>
                  </div>
                  {tour.highlights && tour.highlights.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Highlights</h3>
                      <ul className="grid md:grid-cols-2 gap-4">
                        {tour.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center mt-0.5">
                              <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </span>
                            <span className="text-gray-700">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.includes && tour.includes.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">What&apos;s Included</h3>
                      <ul className="grid md:grid-cols-2 gap-3">
                        {tour.includes.map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-gray-700">
                            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                      {tour.itinerary.map((item: any, i: number) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center"><span className="text-cyan-600 font-bold">{i + 1}</span></div>
                            {i < tour.itinerary!.length - 1 && <div className="w-px h-full bg-cyan-200 mx-auto mt-2" />}
                          </div>
                          <div className="flex-1 pb-6">
                            <h4 className="font-semibold text-gray-900 mb-2">{item.time || item.title || `Step ${i + 1}`}</h4>
                            <p className="text-gray-600">{item.description || item.activity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-gray-500">Detailed itinerary available upon booking.</p>)}
                </div>
              )}
              {activeTab === 'reviews' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
                    <div className="flex items-center gap-2 text-cyan-500">
                      <span className="text-2xl">★</span>
                      <span className="text-xl font-bold text-gray-900">{averageRating}</span>
                      <span className="text-gray-500">({reviews.length} reviews)</span>
                    </div>
                  </div>
                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review, i) => (
                        <div key={i} className="border-b border-gray-100 pb-6 last:border-0">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">{review.user?.firstName?.[0] || 'G'}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">{review.user?.firstName} {review.user?.lastName?.[0]}.</h4>
                                <div className="flex items-center gap-1 text-yellow-500">{Array.from({ length: 5 }).map((_, j) => (<span key={j} className={j < (review.rating || 5) ? '' : 'opacity-30'}>★</span>))}</div>
                              </div>
                              <p className="text-gray-600 mt-2">{review.comment}</p>
                              {review.createdAt && <p className="text-gray-400 text-sm mt-2">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-gray-500">Be the first to review this experience!</p>)}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar - info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-center text-white">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold">Smart Search</h3>
                  <p className="text-white/70 text-sm mt-1">Use the search bar above to ask anything</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="bg-cyan-50 rounded-xl p-4 text-center">
                    <p className="text-cyan-700 font-medium text-sm mb-2">Try searching for:</p>
                    <div className="space-y-2">
                      {['"Best tours under $100"', '"What is included?"', '"Family-friendly tours"', '"Tours near the pyramids"'].map((q, i) => (
                        <p key={i} className="text-cyan-600 text-sm italic">{q}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-100">
                    <div>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Secure</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Instant</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0110.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" /></svg>
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
    </div>
  );
}
