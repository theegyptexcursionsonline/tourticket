'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Star, Users, ShoppingCart, Calendar, MapPin, Info, CheckCircle, Heart, Share2, MessageCircle, Camera } from 'lucide-react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingSidebar from '@/components/BookingSidebar';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import { Tour } from '@/types';
import { getTourById, tours } from '@/lib/data/tours';
import { notFound } from 'next/navigation';

interface TourPageProps {
  params: { slug: string };
}

// Mock reviews data
const reviewsData = [
  {
    id: 1,
    name: 'Sarah M.',
    rating: 5,
    date: '2 days ago',
    title: 'Amazing experience!',
    text: 'The tour was incredible and our guide was very knowledgeable and entertaining. Highly recommend!',
    verified: true,
    helpful: 12
  },
  {
    id: 2,
    name: 'Marco P.',
    rating: 4,
    date: '1 week ago',
    title: 'Great experience',
    text: 'Perfect way to see the city. Only wish it was a bit longer.',
    verified: true,
    helpful: 8
  }
];

export default function TourPage({ params }: TourPageProps) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchTour = async () => {
      setIsLoading(true);
      try {
        const tourData = getTourById(params.slug);
        if (!tourData) {
          notFound();
          return;
        }
        setTour(tourData);
      } catch (error) {
        console.error('Error fetching tour:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTour();
  }, [params.slug]);

  if (isLoading) {
    return (
      <>
        <Header startSolid={true} />
        <main className="bg-slate-50 pt-24 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading tour...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!tour) {
    return null;
  }

  const tourImages = tour.images || [tour.image];
  const relatedTours = tours.filter(t => 
    t.id !== tour.id && 
    (t.destinationId === tour.destinationId || 
     t.categoryIds.some(cat => tour.categoryIds.includes(cat)))
  ).slice(0, 3);

  const handleQuickAdd = () => {
    addToCart(tour);
  };

  const openBookingSidebar = () => {
    setBookingSidebarOpen(true);
  };

  return (
    <>
      <Header startSolid={true} />
      
      <main className="bg-white pt-20">
        {/* Breadcrumb */}
        <div className="bg-slate-50 py-4">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm">
              <a href="/" className="text-slate-500 hover:text-red-600">Home</a>
              <span className="text-slate-400">/</span>
              <a href="/tours" className="text-slate-500 hover:text-red-600">Tours</a>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800 font-medium">{tour.title}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <a href="/" className="inline-flex items-center gap-2 text-red-600 font-semibold mb-6 hover:underline transition-colors">
            <ArrowLeft size={20} />
            <span>Back to all tours</span>
          </a>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero Section */}
              <div className="relative">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {tour.tags?.map((tag, index) => (
                    <span key={index} className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                      tag.includes('%') || tag === 'Online only deal' 
                        ? 'bg-red-600 text-white' 
                        : tag === 'Staff favourite' 
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-800'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Main Image */}
                <div className="relative rounded-xl overflow-hidden shadow-lg mb-6">
                  <Image
                    src={tourImages[selectedImageIndex]}
                    alt={tour.title}
                    width={800}
                    height={500}
                    className="w-full h-[400px] object-cover"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => setIsWishlisted(!isWishlisted)}
                      className={`p-3 rounded-full backdrop-blur-sm transition-colors ${
                        isWishlisted 
                          ? 'bg-red-600 text-white' 
                          : 'bg-white/70 text-slate-600 hover:bg-white hover:text-red-600'
                      }`}
                    >
                      <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
                    </button>
                    <button className="p-3 bg-white/70 backdrop-blur-sm rounded-full text-slate-600 hover:bg-white hover:text-slate-800 transition-colors">
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Image Gallery Thumbnails */}
                {tourImages.length > 1 && (
                  <div className="flex gap-2 mb-6">
                    {tourImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedImageIndex === index 
                            ? 'border-red-600' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${tour.title} ${index + 1}`}
                          width={80}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Tour Title and Basic Info */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3">{tour.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500 fill-current" />
                        <span className="font-bold text-slate-800">{tour.rating}</span>
                        <span>({tour.bookings?.toLocaleString()} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{tour.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span>{tour.location?.address || 'Amsterdam'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {tour.originalPrice && (
                      <p className="text-slate-500 line-through text-lg">
                        {formatPrice(tour.originalPrice)}
                      </p>
                    )}
                    <p className="text-3xl font-extrabold text-red-600">
                      {formatPrice(tour.discountPrice)}
                    </p>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>
                </div>
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <Calendar className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-800">Free Cancellation</h3>
                  <p className="text-sm text-slate-600">{tour.cancellationPolicy || 'Up to 24 hours in advance'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <Users className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-800">Group Friendly</h3>
                  <p className="text-sm text-slate-600">Perfect for all group sizes</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <Camera className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-800">Mobile Ticket</h3>
                  <p className="text-sm text-slate-600">Show on your smartphone</p>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">About this experience</h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {tour.longDescription || tour.description}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tour.includes && tour.includes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3">What's included</h3>
                      <ul className="space-y-2">
                        {tour.includes.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-slate-600">
                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {tour.highlights && tour.highlights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3">Highlights</h3>
                      <ul className="space-y-2">
                        {tour.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2 text-slate-600">
                            <Star size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Meeting Point */}
              {tour.meetingPoint && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Meeting point</h2>
                  <div className="flex items-start gap-4">
                    <MapPin className="text-red-600 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-semibold text-slate-800">{tour.meetingPoint}</p>
                      <p className="text-sm text-slate-600 mt-1">Check-in 15 minutes before departure time</p>
                      <button className="text-red-600 hover:underline text-sm font-medium mt-2">
                        View on map
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Important Information */}
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2">Important information</h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• {tour.ageRestriction || 'Suitable for all ages'}</li>
                      <li>• Only service dogs are allowed</li>
                      <li>• Weather conditions may affect the tour</li>
                      <li>• {tour.cancellationPolicy || 'Check cancellation policy'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Reviews</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star size={18} className="text-yellow-500 fill-current" />
                      <span className="font-bold text-lg">{tour.rating}</span>
                    </div>
                    <span className="text-slate-500">({tour.bookings?.toLocaleString()} reviews)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {reviewsData.map((review) => (
                    <div key={review.id} className="border-b border-slate-200 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">{review.name}</span>
                            {review.verified && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={14} 
                                  className={`${i < review.rating ? 'text-yellow-500 fill-current' : 'text-slate-300'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-sm text-slate-500">{review.date}</span>
                          </div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-slate-800 mb-1">{review.title}</h4>
                      <p className="text-slate-600 text-sm mb-2">{review.text}</p>
                      <button className="text-slate-500 hover:text-slate-700 text-xs">
                        Helpful ({review.helpful})
                      </button>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-6 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                  View all reviews
                </button>
              </div>

              {/* Related Tours */}
              {relatedTours.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedTours.map((relatedTour) => (
                      <a key={relatedTour.id} href={`/tours/${relatedTour.slug}`} className="group">
                        <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <Image
                              src={relatedTour.image}
                              alt={relatedTour.title}
                              width={300}
                              height={200}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {relatedTour.tags?.map((tag, index) => (
                              <span key={index} className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${
                                tag.includes('%') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                              }`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-sm text-slate-800 mb-1 line-clamp-2">{relatedTour.title}</h3>
                            <div className="flex items-center gap-1 mb-1 text-xs text-slate-500">
                              <Clock size={12} />
                              <span>{relatedTour.duration}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star size={12} className="text-yellow-500 fill-current" />
                                <span className="text-xs font-bold">{relatedTour.rating}</span>
                              </div>
                              <span className="font-bold text-red-600">{formatPrice(relatedTour.discountPrice)}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Price Card */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      {tour.originalPrice && (
                        <span className="text-slate-500 line-through text-lg">{formatPrice(tour.originalPrice)}</span>
                      )}
                      <span className="text-4xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
                    </div>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock size={20} className="text-red-500" />
                      <span>Duration: {tour.duration}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Star size={20} className="text-yellow-500" />
                      <span>Rating: {tour.rating} ({tour.bookings?.toLocaleString()} reviews)</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Users size={20} className="text-blue-500" />
                      <span>Available daily</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={openBookingSidebar}
                      className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Calendar size={20} />
                      <span>Select Date & Time</span>
                    </button>
                    
                    <button 
                      onClick={handleQuickAdd}
                      className="w-full bg-white text-red-600 font-bold py-3 px-6 rounded-full border-2 border-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={20} />
                      <span>Quick Add to Cart</span>
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <CheckCircle size={16} className="text-green-600" />
                        <span>Free cancellation</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Camera size={16} className="text-blue-600" />
                        <span>Mobile ticket</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Card */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Need help?</h3>
                  <div className="space-y-3">
                    <button className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <MessageCircle size={18} />
                      <span>Chat with us</span>
                    </button>
                    <a href="tel:+31204204000" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <span className="text-lg">📞</span>
                      <span>+31 (0)20 420 4000</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Booking Sidebar */}
      <BookingSidebar 
        isOpen={isBookingSidebarOpen} 
        onClose={() => setBookingSidebarOpen(false)} 
        tour={tour} 
      />
    </>
  );
}