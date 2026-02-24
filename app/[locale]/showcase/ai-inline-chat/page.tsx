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
  title: 'Tours with Inline Chat | Egypt Excursions Online',
  description: 'Browse tours with a built-in chat panel for instant help. Get recommendations and answers while you explore.',
};

async function getPublishedTours() {
  try {
    await dbConnect();
    const tours = await Tour.find({ isPublished: true })
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .select('title slug image price discountPrice description destination duration')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();
    return JSON.parse(JSON.stringify(tours));
  } catch (error) {
    console.error('Failed to fetch tours:', error);
    return [];
  }
}

export default async function AIInlineChatShowcasePage() {
  const tours = await getPublishedTours();

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pt-20">
        <section className="relative overflow-hidden py-20 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-500/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-full text-emerald-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Inline Chat Available
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 font-serif">
                Browse &
                <span className="text-emerald-600"> Chat</span>
              </h1>

              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Explore tours with a built-in chat panel right alongside the content.
                Ask questions, get recommendations, and book — all without leaving the page.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-12">
                {['Always Visible Chat', 'No Popups', 'Personalized Help', 'Instant Answers'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Popular Tours</h2>

          {tours.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map((tour: any) => {
                const destination = typeof tour.destination === 'object' ? tour.destination : null;
                return (
                  <Link
                    key={tour._id}
                    href={`/showcase/ai-inline-chat/${tour.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-300"
                  >
                    <div className="relative h-48 overflow-hidden">
                      {tour.image ? (
                        <Image src={tour.image} alt={tour.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                          <svg className="w-16 h-16 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">{tour.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        {destination && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {destination.name}
                          </span>
                        )}
                        {tour.duration && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {tour.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{tour.description}</p>
                      <span className="text-emerald-600 font-semibold text-sm group-hover:underline">View Details →</span>
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
