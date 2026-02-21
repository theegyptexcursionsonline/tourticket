'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import Script from 'next/script';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  Star, Clock, Users, MapPin, Calendar, Heart, ChevronDown, ChevronUp,
  MessageCircle, Check, X, Camera, Shield, Info, CheckCircle,
  Umbrella, Bus, Utensils, Mountain, Languages,
  CreditCard, Navigation, Backpack,
  Sun, Snowflake, Eye, Accessibility,
  Smartphone, ChevronLeft, ChevronRight, ZoomIn
} from 'lucide-react';
import { ITour } from '@/lib/models/Tour';

// --- Types ---

interface TourEnhancement {
  itinerary?: any[];
  whatToBring?: string[];
  whatToWear?: string[];
  physicalRequirements?: string;
  accessibilityInfo?: string[];
  groupSize?: { min: number; max: number };
  transportationDetails?: string;
  mealInfo?: string;
  weatherPolicy?: string;
  photoPolicy?: string;
  tipPolicy?: string;
  healthSafety?: string[];
  culturalInfo?: string[];
  seasonalVariations?: string;
  localCustoms?: string[];
}

interface InlineBookingClientPageProps {
  tour: ITour;
  reviews: any[];
  relatedTours: ITour[];
  widgetConfig: {
    orgId: string;
    productId: string;
    apiUrl: string;
  };
}

// --- Helpers ---

const extractEnhancementData = (tour: ITour): TourEnhancement => ({
  itinerary: tour.itinerary && tour.itinerary.length > 0 ? tour.itinerary.map(item => ({ ...item, icon: item.icon || 'location' })) : [],
  whatToBring: tour.whatToBring && tour.whatToBring.length > 0 ? tour.whatToBring : ["Camera for photos", "Comfortable walking shoes", "Valid ID or passport", "Weather-appropriate clothing", "Water bottle"],
  whatToWear: tour.whatToWear && tour.whatToWear.length > 0 ? tour.whatToWear : ["Comfortable walking shoes", "Weather-appropriate clothing", "Modest attire for religious sites", "Layers for varying temperatures"],
  physicalRequirements: tour.physicalRequirements || "Moderate walking required. Tour involves stairs and uneven surfaces.",
  accessibilityInfo: tour.accessibilityInfo && tour.accessibilityInfo.length > 0 ? tour.accessibilityInfo : ["Limited wheelchair accessibility", "Audio guides available", "Service animals welcome", "Contact us for special requirements"],
  groupSize: tour.groupSize || { min: 1, max: tour.maxGroupSize || 20 },
  transportationDetails: tour.transportationDetails || "Meeting point instructions provided upon booking.",
  mealInfo: tour.mealInfo || "No meals included unless specified.",
  weatherPolicy: tour.weatherPolicy || "Tours operate rain or shine. Severe weather may result in rescheduling.",
  photoPolicy: tour.photoPolicy || "Photography encouraged. Respect restrictions at certain venues.",
  tipPolicy: tour.tipPolicy || "Gratuities are not included but appreciated.",
  healthSafety: tour.healthSafety && tour.healthSafety.length > 0 ? tour.healthSafety : ["Enhanced safety protocols", "Hand sanitizer available", "First aid trained guides"],
  culturalInfo: tour.culturalInfo && tour.culturalInfo.length > 0 ? tour.culturalInfo : ["Learn local history", "Discover architecture", "Experience local atmosphere"],
  seasonalVariations: tour.seasonalVariations || "Experience may vary by season.",
  localCustoms: tour.localCustoms && tour.localCustoms.length > 0 ? tour.localCustoms : ["Arrive 15 minutes early", "Respect local customs", "Follow guide instructions"]
});

const defaultFAQs = [
  { question: "What happens if I'm late for the departure?", answer: "Please arrive 15 minutes before departure. Late arrivals cannot be accommodated." },
  { question: "Can dietary restrictions be accommodated?", answer: "Yes! Please inform us at least 24 hours before your tour." },
  { question: "Is this tour suitable for children?", answer: "Absolutely! Children 4-13 receive discounted pricing, 0-3 travel free." },
  { question: "Can I reschedule my booking?", answer: "Yes, up to 24 hours before departure subject to availability." },
];

const ItineraryIcon = ({ iconType, className = "w-5 h-5" }: { iconType?: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    location: <MapPin className={className} />, transport: <Bus className={className} />,
    monument: <Mountain className={className} />, camera: <Camera className={className} />,
    food: <Utensils className={className} />, time: <Clock className={className} />,
    info: <Info className={className} />, activity: <Users className={className} />,
  };
  return icons[iconType || 'location'] || icons.location;
};

// --- Lightbox ---

const Lightbox = ({ images, selectedIndex, onClose }: { images: string[]; selectedIndex: number; onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const nextImage = (e?: React.MouseEvent) => { e?.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % images.length); };
  const prevImage = (e?: React.MouseEvent) => { e?.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50"><X size={32} /></button>
      <div className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img key={currentIndex} src={images[currentIndex]} alt={`Image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full object-contain rounded-lg" />
        </AnimatePresence>
      </div>
      <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><ChevronLeft size={28} /></button>
      <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><ChevronRight size={28} /></button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full" onClick={(e) => e.stopPropagation()}>
        {currentIndex + 1} / {images.length}
      </div>
    </motion.div>
  );
};

// --- Main Component ---

export default function InlineBookingClientPage({ tour, reviews, relatedTours, widgetConfig }: InlineBookingClientPageProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '4.9';

  const tourImages = [tour.image, ...(tour.images || [])].filter(Boolean) as string[];
  const enhancement = extractEnhancementData(tour);
  const faqs = tour.faq && tour.faq.length > 0 ? tour.faq : defaultFAQs;

  return (
    <>
      <AnimatePresence>
        {isLightboxOpen && tourImages.length > 0 && (
          <Lightbox images={tourImages} selectedIndex={selectedImageIndex} onClose={() => setIsLightboxOpen(false)} />
        )}
      </AnimatePresence>

      <div className="pt-16 md:pt-20">
        {/* Breadcrumb */}
        <div className="bg-emerald-50/50 py-3 border-b border-emerald-200/50">
          <div className="max-w-5xl mx-auto px-4">
            <nav className="flex items-center gap-1.5 text-xs">
              <Link href="/" className="text-slate-500 hover:text-emerald-600 transition-colors">Home</Link>
              <span className="text-slate-400">/</span>
              <Link href="/showcase/inline-booking" className="text-slate-500 hover:text-emerald-600 transition-colors">Inline Booking</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800 font-medium truncate max-w-[200px] md:max-w-none">{tour.title}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Image Gallery */}
          <div className="mb-8">
            <div className="relative rounded-xl overflow-hidden shadow-lg mb-4 group cursor-pointer"
              onClick={() => { setSelectedImageIndex(selectedImageIndex); setIsLightboxOpen(true); }}>
              <Image src={tourImages[selectedImageIndex] || '/placeholder.jpg'} alt={tour.title}
                width={1200} height={700} className="w-full h-[420px] md:h-[500px] object-cover" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="text-white w-16 h-16" />
              </div>
            </div>
            {tourImages.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tourImages.map((image, index) => (
                  <button key={index} onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === index ? 'border-emerald-600 scale-105 shadow' : 'border-slate-200 hover:border-slate-300'}`}>
                    <Image src={image} alt={`${tour.title} image ${index + 1}`} width={80} height={64} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Meta + Price */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">{tour.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-500 fill-current" />
                    <span className="font-semibold text-slate-800">{averageRating}</span>
                    <span className="text-slate-500">({reviews.length} reviews)</span>
                  </div>
                  {tour.duration && <div className="flex items-center gap-1"><Clock size={16} /><span>{tour.duration}</span></div>}
                  {destination && <div className="flex items-center gap-1"><MapPin size={16} /><span>{destination.name}</span></div>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-extrabold text-emerald-600">${tour.price || tour.discountPrice || 125}</p>
                <p className="text-sm text-slate-500">per person</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <Shield size={12} /><span>Free cancellation</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* INLINE BOOKING WIDGET — The Star of the Show */}
          {/* ============================================ */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Book This Experience</h2>
                  <p className="text-sm text-slate-500">Select your date and complete booking below</p>
                </div>
              </div>

              {/* Inline Widget Container */}
              <div id="foxes-inline-booking-showcase" className="min-h-[400px] bg-white rounded-xl border border-emerald-100 overflow-hidden" />
            </div>
          </div>

          {/* Overview */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">About this experience</h2>
              <div className="prose prose-slate max-w-none mb-6" dangerouslySetInnerHTML={{ __html: tour.longDescription || tour.description }} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tour.includes && tour.includes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">What&apos;s included</h3>
                    <ul className="space-y-2">
                      {tour.includes.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600">
                          <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" /><span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tour.highlights && tour.highlights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Highlights</h3>
                    <ul className="space-y-2">
                      {tour.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600">
                          <Star size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" /><span className="text-sm">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                <Calendar className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900">Free Cancellation</h3>
                <p className="text-sm text-slate-600">{tour.cancellationPolicy || 'Up to 24 hours in advance'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                <Users className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900">Group Friendly</h3>
                <p className="text-sm text-slate-600">Perfect for all group sizes</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                <Smartphone className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900">Mobile Ticket</h3>
                <p className="text-sm text-slate-600">Show on your smartphone</p>
              </div>
            </div>

            {/* Reviews */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Reviews</h2>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-yellow-500 fill-current" />
                  <span className="font-bold text-lg">{averageRating}</span>
                  <span className="text-slate-500">({reviews.length} reviews)</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {reviews.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {reviews.map((review: any, index: number) => (
                      <div key={index} className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {review.user?.firstName?.[0] || 'G'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-slate-900">{review.user?.firstName} {review.user?.lastName?.[0]}.</h4>
                              <div className="flex items-center gap-1 text-yellow-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={i < (review.rating || 5) ? '' : 'opacity-30'}>★</span>
                                ))}
                              </div>
                            </div>
                            <p className="text-slate-600 text-sm mt-1">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">No reviews yet.</div>
                )}
              </div>
            </div>

            {/* FAQ */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <MessageCircle size={24} className="text-emerald-600" />
                Frequently Asked Questions
              </h3>
              {faqs.map((faq: any, index: number) => (
                <div key={index} className="border border-slate-200 rounded-lg">
                  <button onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <span className="font-semibold text-slate-800 pr-4">{faq.question}</span>
                    {openFaq === index ? <ChevronUp size={20} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={20} className="text-slate-500 flex-shrink-0" />}
                  </button>
                  {openFaq === index && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      <p className="text-slate-600 text-sm leading-relaxed mt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Related Tours */}
            {relatedTours.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {relatedTours.map((relatedTour: any) => (
                    <Link key={relatedTour._id} href={`/showcase/inline-booking/${relatedTour.slug}`} className="group">
                      <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        {relatedTour.image && (
                          <Image src={relatedTour.image} alt={relatedTour.title} width={300} height={200}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                        )}
                        <div className="p-3">
                          <h3 className="font-bold text-sm text-slate-800 mb-1 line-clamp-2">{relatedTour.title}</h3>
                          <span className="font-bold text-emerald-600">${relatedTour.price || relatedTour.discountPrice || 99}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Foxes Inline Widget Script */}
      <Script src={`${widgetConfig.apiUrl}/widget/foxes-inline-widget.js`} strategy="lazyOnload"
        data-org-id={widgetConfig.orgId}
        data-container="foxes-inline-booking-showcase"
        data-api-url={widgetConfig.apiUrl}
        data-primary-color="#059669"
        data-accent-color="#10B981" />
    </>
  );
}
