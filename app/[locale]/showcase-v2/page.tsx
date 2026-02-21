import { Link } from '@/i18n/routing';
import Image from 'next/image';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export const metadata = {
  title: 'Book Tours | Egypt Excursions Online',
  description: 'Browse and book the best tours and excursions in Egypt. Seamless booking on desktop and mobile.',
};

export default async function ShowcaseV2Page() {
  await dbConnect();

  const tours = await Tour.find({ isPublished: true })
    .populate('destination', 'name slug')
    .populate('category', 'name slug')
    .limit(12)
    .lean();

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full text-indigo-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            Top Rated Experiences
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 font-serif">
            Book Your Next Adventure
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our curated collection of tours and excursions. Book seamlessly on any device with instant confirmation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Secure Booking</h3>
            <p className="text-gray-600 text-sm">Book with confidence. Your payment is protected with industry-standard encryption.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Instant Confirmation</h3>
            <p className="text-gray-600 text-sm">Get your booking confirmed instantly. No waiting, no hassle.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Free Cancellation</h3>
            <p className="text-gray-600 text-sm">Plans changed? Cancel for free up to 24 hours before your experience.</p>
          </div>
        </div>

        {/* Tours Grid */}
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Browse All Tours</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tours.map((tour: any) => (
            <Link
              key={tour._id.toString()}
              href={`/showcase-v2/${tour.slug}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                {tour.image ? (
                  <Image
                    src={tour.image}
                    alt={tour.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg line-clamp-2">{tour.title}</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {tour.duration && (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{tour.duration}</span>
                      </>
                    )}
                  </div>
                  <span className="text-indigo-600 font-bold">
                    From ${tour.price || tour.discountPrice || 99}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-indigo-600 font-medium text-sm group-hover:gap-3 transition-all">
                  <span>View Details</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
