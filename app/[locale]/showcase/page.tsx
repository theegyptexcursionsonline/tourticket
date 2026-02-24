import React from 'react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'AI Booking Engine Showcase | Foxes Technology × Egypt Excursions Online',
  description: 'Explore all booking widgets powered by Foxes Technology AI Booking Engine. Calendar, inline booking, modals, product pages, and more.',
};

const widgets = [
  {
    id: 'calendar-sidebar',
    name: 'Calendar + Sidebar',
    description: 'Embedded calendar widget with a sidebar booking panel. The core booking experience for tour detail pages.',
    href: '/showcase',
    color: 'amber',
    bgFrom: 'from-amber-500',
    bgTo: 'to-orange-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    isCurrent: true,
  },
  {
    id: 'floating-button',
    name: 'Floating Book Now',
    description: 'A floating button that opens a sidebar booking panel. Add booking to any website with one script tag.',
    href: '/showcase-v2',
    color: 'indigo',
    bgFrom: 'from-indigo-500',
    bgTo: 'to-purple-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'inline-booking',
    name: 'Inline Booking',
    description: 'Full booking flow embedded directly on the page. No popups, no sidebars — book without leaving the content.',
    href: '/showcase/inline-booking',
    color: 'emerald',
    bgFrom: 'from-emerald-500',
    bgTo: 'to-teal-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'booking-modal',
    name: 'Booking Modal',
    description: 'Popup modal overlay for booking. Clean, focused, distraction-free. Opens and closes with one click.',
    href: '/showcase/booking-modal',
    color: 'purple',
    bgFrom: 'from-purple-500',
    bgTo: 'to-fuchsia-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'product-page',
    name: 'Product Page',
    description: 'Complete standalone product page — photos, descriptions, calendar, and checkout. All managed by Foxes.',
    href: '/showcase/product-page',
    color: 'rose',
    bgFrom: 'from-rose-500',
    bgTo: 'to-pink-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'product-list',
    name: 'Product List',
    description: 'Display all bookable products in a responsive grid. Perfect for landing pages and catalog sections.',
    href: '/showcase/product-list',
    color: 'cyan',
    bgFrom: 'from-cyan-500',
    bgTo: 'to-blue-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'ai-search',
    name: 'AI Search Agent',
    description: 'AI-powered travel concierge that helps customers find and book tours through intelligent chat.',
    href: '/showcase/ai-search-agent',
    color: 'violet',
    bgFrom: 'from-violet-500',
    bgTo: 'to-indigo-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'ai-voice',
    name: 'AI Voice Agent',
    description: 'Voice-powered assistant for hands-free tour browsing and booking in 29+ languages.',
    href: '/showcase/ai-voice-agent',
    color: 'sky',
    bgFrom: 'from-sky-500',
    bgTo: 'to-blue-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: 'ai-inline-chat',
    name: 'AI Inline Chat',
    description: 'Embedded chat panel that lives alongside your content. Always visible, no popups needed.',
    href: '/showcase/ai-inline-chat',
    color: 'emerald',
    bgFrom: 'from-emerald-500',
    bgTo: 'to-teal-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'ai-search-bar',
    name: 'AI Search Bar',
    description: 'Smart search input that understands natural language and returns tour recommendations.',
    href: '/showcase/ai-search-bar',
    color: 'cyan',
    bgFrom: 'from-cyan-500',
    bgTo: 'to-blue-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
      </svg>
    ),
  },
  {
    id: 'ai-chat-modal',
    name: 'AI Chat Modal',
    description: 'On-demand chat assistant triggered by your own button. Zero clutter until opened.',
    href: '/showcase/ai-chat-modal',
    color: 'purple',
    bgFrom: 'from-purple-500',
    bgTo: 'to-fuchsia-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    id: 'ai-chat-page',
    name: 'AI Full Page Chat',
    description: 'Dedicated assistant page with sidebar prompts. Perfect for help centers and support pages.',
    href: '/showcase/ai-chat-page',
    color: 'indigo',
    bgFrom: 'from-indigo-500',
    bgTo: 'to-violet-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'gift-card',
    name: 'Gift Card',
    description: 'Let customers purchase gift cards for any experience. Custom amounts and personal messages.',
    href: '/showcase/gift-card',
    color: 'amber',
    bgFrom: 'from-amber-500',
    bgTo: 'to-yellow-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    comingSoon: true,
  },
];

async function getPublishedTours() {
  await dbConnect();
  const tours = await Tour.find({ isPublished: true })
    .populate('destination', 'name slug')
    .populate('category', 'name slug')
    .select('title slug image price discountPrice description destination duration')
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  return JSON.parse(JSON.stringify(tours));
}

export default async function ShowcaseIndexPage() {
  const tours = await getPublishedTours();

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-indigo-500/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 border border-indigo-200 rounded-full text-indigo-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                AI Booking Engine Showcase
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 font-serif">
                Foxes Technology
                <span className="text-indigo-600"> Widgets</span>
              </h1>

              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Explore our complete suite of embeddable booking widgets. Each widget is
                customizable, mobile-responsive, and ready to add to any website with a single script tag.
              </p>
            </div>
          </div>
        </section>

        {/* Widget Showcase Grid */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">All Widgets</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {widgets.map((widget) => (
              <Link
                key={widget.id}
                href={widget.href}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300"
              >
                {/* Gradient Header */}
                <div className={`h-28 bg-gradient-to-br ${widget.bgFrom} ${widget.bgTo} flex items-center justify-center relative`}>
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white">
                    {widget.icon}
                  </div>
                  {widget.comingSoon && (
                    <span className="absolute top-3 right-3 px-2 py-1 bg-white/90 text-xs font-semibold text-gray-700 rounded-full">
                      Coming Soon
                    </span>
                  )}
                  {widget.isCurrent && (
                    <span className="absolute top-3 right-3 px-2 py-1 bg-white/90 text-xs font-semibold text-green-700 rounded-full">
                      Default
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors">
                    {widget.name}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    {widget.description}
                  </p>
                  <span className="text-indigo-600 font-semibold text-sm group-hover:underline">
                    View Showcase &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Tour Preview — Calendar + Sidebar (Default Showcase) */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Popular Tours — Calendar + Sidebar Demo</h2>
            <Link href="/showcase" className="text-amber-600 font-semibold text-sm hover:underline">View All &rarr;</Link>
          </div>

          {tours.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map((tour: any) => {
                const destination = typeof tour.destination === 'object' ? tour.destination : null;
                return (
                  <Link
                    key={tour._id}
                    href={`/showcase/${tour.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-amber-200 transition-all duration-300"
                  >
                    <div className="relative h-48 overflow-hidden">
                      {tour.image ? (
                        <Image src={tour.image} alt={tour.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          <svg className="w-16 h-16 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-sm font-bold rounded-full">
                          From ${tour.price || tour.discountPrice || 99}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors line-clamp-2">{tour.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        {destination && <span>{destination.name}</span>}
                        {tour.duration && <span>{tour.duration}</span>}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{tour.description}</p>
                      <span className="text-amber-600 font-semibold text-sm group-hover:underline">View Details &rarr;</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No tours available at the moment.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
