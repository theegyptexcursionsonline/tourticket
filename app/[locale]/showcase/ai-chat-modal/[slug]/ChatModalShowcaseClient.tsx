'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { ITour } from '@/lib/models/Tour';

interface ChatModalShowcaseClientProps {
  tour: ITour;
  reviews: any[];
  widgetConfig: { apiUrl: string; widgetId: string };
}

export default function ChatModalShowcaseClient({ tour, reviews, widgetConfig }: ChatModalShowcaseClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'reviews'>('overview');
  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : '4.9';

  useEffect(() => {
    if (!widgetConfig.widgetId) return;
    const scriptId = 'foxes-chat-modal-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${widgetConfig.apiUrl}/widget/foxes-chat-modal.js`;
    script.async = true;
    script.setAttribute('data-widget-id', widgetConfig.widgetId);
    script.setAttribute('data-accent', '#9333ea');
    script.setAttribute('data-agent-name', 'Travel Concierge');
    script.setAttribute('data-greeting', 'Hi! Ask me anything about this tour or let me help you find the perfect experience.');
    script.setAttribute('data-show-branding', 'true');
    script.setAttribute('data-track-events', 'true');

    document.body.appendChild(script);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [widgetConfig.widgetId, widgetConfig.apiUrl]);

  const openChat = () => {
    if (typeof window !== 'undefined' && (window as any).FoxesChat) {
      (window as any).FoxesChat.open();
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative h-[45vh] min-h-[350px] overflow-hidden">
        {tour.image && <Image src={tour.image} alt={tour.title} fill className="object-cover" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-5xl mx-auto">
            <nav className="flex items-center gap-2 text-white/80 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              {destination && (<><Link href={`/destinations/${destination.slug}`} className="hover:text-white transition-colors">{destination.name}</Link><span>/</span></>)}
              <span className="text-purple-300">{tour.title}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-serif">{tour.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-purple-300 text-xl">★</span>
                <span className="font-semibold">{averageRating}</span>
                <span className="text-white/60">({reviews.length || '2,500+'} reviews)</span>
              </div>
              {tour.duration && (<div className="flex items-center gap-2"><svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{tour.duration}</span></div>)}
              {destination && (<div className="flex items-center gap-2"><svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg><span>{destination.name}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Single Column */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        {/* Price + CTA */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm mb-1">Starting from</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">${tour.price || tour.discountPrice || 125}</span>
              <span className="text-gray-500">/ person</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span>Free cancellation</span>
            </div>
            <button
              onClick={openChat}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-purple-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Chat with Us
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8">
          {(['overview', 'itinerary', 'reviews'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === tab ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
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
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
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

              {/* Inline CTA */}
              <div className="bg-purple-50 rounded-2xl p-8 text-center border border-purple-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Have a Question?</h3>
                <p className="text-gray-600 mb-4">Get instant answers about this tour, pricing, or availability.</p>
                <button onClick={openChat}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-purple-200 inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  Chat with Us
                </button>
              </div>
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
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><span className="text-purple-600 font-bold">{i + 1}</span></div>
                        {i < tour.itinerary!.length - 1 && <div className="w-px h-full bg-purple-200 mx-auto mt-2" />}
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
                <div className="flex items-center gap-2 text-purple-500">
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
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold">{review.user?.firstName?.[0] || 'G'}</div>
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
      </section>
    </div>
  );
}
