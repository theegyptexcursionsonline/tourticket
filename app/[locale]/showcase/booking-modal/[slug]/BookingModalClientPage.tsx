'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import Script from 'next/script';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Star, Clock, Users, MapPin, Calendar, ChevronDown, ChevronUp,
  MessageCircle, X, Shield, CheckCircle,
  CreditCard, Smartphone, ChevronLeft, ChevronRight, ZoomIn
} from 'lucide-react';
import { ITour } from '@/lib/models/Tour';

interface BookingModalClientPageProps {
  tour: ITour;
  reviews: any[];
  relatedTours: ITour[];
  widgetConfig: {
    orgId: string;
    productId: string;
    apiUrl: string;
  };
}

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
      <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-500 z-50"><X size={32} /></button>
      <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img key={currentIndex} src={images[currentIndex]} alt={`Image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full object-contain rounded-lg" />
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

const defaultFAQs = [
  { question: "What happens if I'm late?", answer: "Please arrive 15 minutes before departure. Late arrivals cannot be accommodated." },
  { question: "Is this suitable for children?", answer: "Yes! Children 4-13 get discounted pricing, 0-3 travel free." },
  { question: "Can I reschedule?", answer: "Yes, up to 24 hours before departure subject to availability." },
];

export default function BookingModalClientPage({ tour, reviews, relatedTours, widgetConfig }: BookingModalClientPageProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isModalLoaded, setIsModalLoaded] = useState(false);

  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '4.9';
  const tourImages = [tour.image, ...(tour.images || [])].filter(Boolean) as string[];
  const faqs = tour.faq && tour.faq.length > 0 ? tour.faq : defaultFAQs;

  const openBookingModal = () => {
    if (typeof window !== 'undefined' && (window as any).FoxesBookingModal) {
      (window as any).FoxesBookingModal.open();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLightboxOpen && tourImages.length > 0 && (
          <Lightbox images={tourImages} selectedIndex={selectedImageIndex} onClose={() => setIsLightboxOpen(false)} />
        )}
      </AnimatePresence>

      <div className="pt-16 md:pt-20">
        {/* Breadcrumb */}
        <div className="bg-purple-50/50 py-3 border-b border-purple-200/50">
          <div className="max-w-5xl mx-auto px-4">
            <nav className="flex items-center gap-1.5 text-xs">
              <Link href="/" className="text-slate-500 hover:text-purple-600">Home</Link>
              <span className="text-slate-400">/</span>
              <Link href="/showcase/booking-modal" className="text-slate-500 hover:text-purple-600">Modal Booking</Link>
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
                    className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === index ? 'border-purple-600 scale-105 shadow' : 'border-slate-200'}`}>
                    <Image src={image} alt={`${tour.title} ${index + 1}`} width={80} height={64} className="w-full h-full object-cover" />
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
                <p className="text-3xl font-extrabold text-purple-600">${tour.price || tour.discountPrice || 125}</p>
                <p className="text-sm text-slate-500">per person</p>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* BOOKING MODAL CTA — The Star of the Show    */}
          {/* ============================================ */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-8 text-center text-white shadow-xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Book?</h2>
              <p className="text-white/80 mb-6 max-w-lg mx-auto">
                Click the button below to open the booking modal. Select your date, choose guests, and complete your booking — all in a focused popup overlay.
              </p>
              <button
                onClick={openBookingModal}
                className="px-8 py-4 bg-white text-purple-700 font-bold text-lg rounded-xl hover:bg-purple-50 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
              >
                Open Booking Modal
              </button>
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/70">
                <div className="flex items-center gap-1"><Shield size={14} /><span>Secure</span></div>
                <div className="flex items-center gap-1"><CreditCard size={14} /><span>Easy Payment</span></div>
                <div className="flex items-center gap-1"><Calendar size={14} /><span>Free Cancel</span></div>
              </div>
            </div>
          </div>

          {/* Overview */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">About this experience</h2>
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
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900">Free Cancellation</h3>
                <p className="text-sm text-slate-600">{tour.cancellationPolicy || 'Up to 24 hours in advance'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900">Group Friendly</h3>
                <p className="text-sm text-slate-600">Perfect for all group sizes</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                <Smartphone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
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
                  <span className="text-slate-500">({reviews.length})</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {reviews.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {reviews.map((review: any, index: number) => (
                      <div key={index} className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-fuchsia-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
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
                <MessageCircle size={24} className="text-purple-600" /> FAQ
              </h3>
              {faqs.map((faq: any, index: number) => (
                <div key={index} className="border border-slate-200 rounded-lg">
                  <button onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50">
                    <span className="font-semibold text-slate-800 pr-4">{faq.question}</span>
                    {openFaq === index ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                  </button>
                  {openFaq === index && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      <p className="text-slate-600 text-sm mt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Second CTA */}
            <div className="text-center py-8">
              <button
                onClick={openBookingModal}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Book This Experience
              </button>
            </div>

            {/* Related Tours */}
            {relatedTours.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {relatedTours.map((rt: any) => (
                    <Link key={rt._id} href={`/showcase/booking-modal/${rt.slug}`} className="group">
                      <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        {rt.image && <Image src={rt.image} alt={rt.title} width={300} height={200} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />}
                        <div className="p-3">
                          <h3 className="font-bold text-sm text-slate-800 mb-1 line-clamp-2">{rt.title}</h3>
                          <span className="font-bold text-purple-600">${rt.price || rt.discountPrice || 99}</span>
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

      {/* Foxes Booking Modal Script */}
      <Script src={`${widgetConfig.apiUrl}/widget/foxes-booking-modal.js`} strategy="lazyOnload"
        data-org-id={widgetConfig.orgId}
        data-api-url={widgetConfig.apiUrl}
        data-primary-color="#9333EA"
        data-accent-color="#A855F7"
        onLoad={() => setIsModalLoaded(true)} />
    </>
  );
}
