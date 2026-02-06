'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { ITour } from '@/lib/models/Tour';

interface ShowcaseClientPageProps {
  tour: ITour;
  reviews: any[];
  widgetConfig: {
    orgId: string;
    productId: string;
    apiUrl: string;
  };
}

export default function ShowcaseClientPage({ tour, reviews, widgetConfig }: ShowcaseClientPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'reviews'>('overview');

  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '4.9';

  // Initialize mobile drawer on mount
  useEffect(() => {
    // Only run on mobile
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;

    const ORG_ID = widgetConfig.orgId;
    const API_URL = widgetConfig.apiUrl;
    const PRICE = String(tour.price || tour.discountPrice || 125);
    const CURRENCY = '$';
    const BUTTON_TEXT = 'Book Now';
    const PRIMARY_COLOR = '#D97706';

    if (!ORG_ID) return;

    // Check if already initialized
    if (document.querySelector('.foxes-mobile-drawer')) return;

    let productId: string | null = null;

    // Fetch product
    async function fetchProduct() {
      try {
        const res = await fetch(`${API_URL}/api/widget/products/${ORG_ID}`);
        if (res.ok) {
          const data = await res.json();
          const products = data.products || [];
          if (products.length > 0) {
            productId = products[0].id;
            updateDrawerContent();
          }
        }
      } catch (e) {
        console.error('[Mobile Drawer] Failed to fetch product:', e);
      }
    }

    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      .foxes-mobile-drawer * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
      .foxes-mobile-bar { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e5e7eb; box-shadow: 0 -4px 20px rgba(0,0,0,0.1); z-index: 99998; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .foxes-mobile-bar-price { flex: 1; }
      .foxes-mobile-bar-current { font-size: 22px; font-weight: 700; color: #111827; }
      .foxes-mobile-bar-unit { font-size: 13px; color: #6b7280; margin-left: 4px; }
      .foxes-mobile-bar-btn { padding: 14px 28px; background: ${PRIMARY_COLOR}; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; }
      .foxes-mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 99999; opacity: 0; visibility: hidden; transition: all 0.3s; }
      .foxes-mobile-overlay.open { opacity: 1; visibility: visible; }
      .foxes-mobile-drawer-panel { position: fixed; bottom: 0; left: 0; right: 0; height: 90vh; background: white; border-radius: 20px 20px 0 0; z-index: 100000; transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1); display: flex; flex-direction: column; }
      .foxes-mobile-drawer-panel.open { transform: translateY(0); }
      .foxes-mobile-drawer-handle { padding: 12px; display: flex; justify-content: center; }
      .foxes-mobile-drawer-handle-bar { width: 40px; height: 4px; background: #d1d5db; border-radius: 2px; }
      .foxes-mobile-drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 0 16px 16px; border-bottom: 1px solid #f3f4f6; }
      .foxes-mobile-drawer-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0; }
      .foxes-mobile-drawer-close { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border: none; border-radius: 10px; cursor: pointer; }
      .foxes-mobile-drawer-close svg { width: 18px; height: 18px; color: #6b7280; }
      .foxes-mobile-drawer-content { flex: 1; overflow: hidden; }
      .foxes-mobile-drawer-iframe { width: 100%; height: 100%; border: none; }
      .foxes-mobile-drawer-loading { display: flex; align-items: center; justify-content: center; height: 100%; }
      .foxes-mobile-drawer-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: ${PRIMARY_COLOR}; border-radius: 50%; animation: foxes-spin 0.8s linear infinite; }
      @keyframes foxes-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.className = 'foxes-mobile-drawer';

    // Create bar
    const bar = document.createElement('div');
    bar.className = 'foxes-mobile-bar';
    bar.innerHTML = `
      <div class="foxes-mobile-bar-price">
        <span class="foxes-mobile-bar-current">${CURRENCY}${PRICE}</span>
        <span class="foxes-mobile-bar-unit">/ person</span>
      </div>
      <button class="foxes-mobile-bar-btn">${BUTTON_TEXT}</button>
    `;
    container.appendChild(bar);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'foxes-mobile-overlay';
    container.appendChild(overlay);

    // Create drawer
    const drawer = document.createElement('div');
    drawer.className = 'foxes-mobile-drawer-panel';
    drawer.innerHTML = `
      <div class="foxes-mobile-drawer-handle"><div class="foxes-mobile-drawer-handle-bar"></div></div>
      <div class="foxes-mobile-drawer-header">
        <h3 class="foxes-mobile-drawer-title">Complete Your Booking</h3>
        <button class="foxes-mobile-drawer-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="foxes-mobile-drawer-content">
        <div class="foxes-mobile-drawer-loading"><div class="foxes-mobile-drawer-spinner"></div></div>
      </div>
    `;
    container.appendChild(drawer);
    document.body.appendChild(container);

    function updateDrawerContent() {
      const content = drawer.querySelector('.foxes-mobile-drawer-content');
      if (!content || !productId) return;
      content.innerHTML = `<iframe class="foxes-mobile-drawer-iframe" src="${API_URL}/calendar-demo/mobile-widget?orgId=${ORG_ID}&productId=${productId}" allow="payment"></iframe>`;
    }

    function openDrawer() {
      overlay.classList.add('open');
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
      updateDrawerContent();
    }

    function closeDrawer() {
      overlay.classList.remove('open');
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    }

    bar.querySelector('.foxes-mobile-bar-btn')?.addEventListener('click', openDrawer);
    drawer.querySelector('.foxes-mobile-drawer-close')?.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    fetchProduct();

    return () => {
      container.remove();
      style.remove();
    };
  }, [widgetConfig, tour]);

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
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

        {/* Hero Content */}
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
              <span className="text-amber-400">{tour.title}</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-serif">
              {tour.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xl">★</span>
                <span className="font-semibold">{averageRating}</span>
                <span className="text-white/60">({reviews.length || '2,500+'}  reviews)</span>
              </div>
              {tour.duration && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{tour.duration}</span>
                </div>
              )}
              {destination && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
                      ? 'bg-white text-amber-600 shadow-sm'
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

                  {/* Highlights */}
                  {tour.highlights && tour.highlights.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Highlights</h3>
                      <ul className="grid md:grid-cols-2 gap-4">
                        {tour.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className="text-gray-700">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Includes */}
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

                  {/* Excludes */}
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
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-amber-600 font-bold">{index + 1}</span>
                            </div>
                            {index < tour.itinerary!.length - 1 && (
                              <div className="w-px h-full bg-amber-200 mx-auto mt-2" />
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
                    <div className="flex items-center gap-2 text-amber-600">
                      <span className="text-2xl">★</span>
                      <span className="text-xl font-bold">{averageRating}</span>
                      <span className="text-gray-500">({reviews.length} reviews)</span>
                    </div>
                  </div>

                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review, index) => (
                        <div key={index} className="border-b border-gray-100 pb-6 last:border-0">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                              {review.user?.firstName?.[0] || 'G'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">
                                  {review.user?.firstName} {review.user?.lastName?.[0]}.
                                </h4>
                                <div className="flex items-center gap-1 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={i < (review.rating || 5) ? '' : 'opacity-30'}>★</span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-600 mt-2">{review.comment}</p>
                              {review.createdAt && (
                                <p className="text-gray-400 text-sm mt-2">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric'
                                  })}
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

          {/* Right Column - Booking Widget (Embed Container) */}
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

              {/* Calendar Widget - Simple Embed Container */}
              <div
                id="foxes-embed-calendar"
                data-org-id={widgetConfig.orgId}
                data-product-id={widgetConfig.productId || ''}
                data-api-url={widgetConfig.apiUrl}
                data-primary-color="#D97706"
                data-accent-color="#F59E0B"
                className="min-h-[400px] bg-white border-x border-gray-200 [&_.fce-widget]:sticky [&_.fce-widget]:top-24"
              />

              {/* Trust Badges */}
              <div className="bg-gray-50 rounded-b-2xl border border-t-0 border-gray-200 p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Secure Booking</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Easy Payment</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Free Cancellation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Foxes Calendar Embed Widget Script - handles desktop calendar */}
      <Script
        src={`${widgetConfig.apiUrl}/widget/foxes-calendar-embed.js`}
        strategy="lazyOnload"
        onLoad={() => {
          // Initialize via programmatic API after script loads
          if (typeof window !== 'undefined' && (window as any).FoxesCalendarEmbed) {
            (window as any).FoxesCalendarEmbed.init({
              containerId: 'foxes-embed-calendar',
              orgId: widgetConfig.orgId,
              productId: widgetConfig.productId || undefined,
              apiUrl: widgetConfig.apiUrl,
            });
          }
        }}
      />

      {/* Mobile drawer is initialized via useEffect above */}
    </div>
  );
}
