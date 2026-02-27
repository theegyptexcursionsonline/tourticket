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

interface ShowcaseClientPageProps {
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
  itinerary: tour.itinerary && tour.itinerary.length > 0 ? tour.itinerary.map(item => ({
    ...item,
    icon: item.icon || 'location'
  })) : [],
  whatToBring: tour.whatToBring && tour.whatToBring.length > 0 ? tour.whatToBring : [
    "Camera for photos", "Comfortable walking shoes", "Valid ID or passport",
    "Weather-appropriate clothing", "Water bottle"
  ],
  whatToWear: tour.whatToWear && tour.whatToWear.length > 0 ? tour.whatToWear : [
    "Comfortable walking shoes", "Weather-appropriate clothing",
    "Modest attire for religious sites", "Layers for varying temperatures"
  ],
  physicalRequirements: tour.physicalRequirements || "Moderate walking required. Tour involves stairs and uneven surfaces. Please inform us of any mobility concerns.",
  accessibilityInfo: tour.accessibilityInfo && tour.accessibilityInfo.length > 0 ? tour.accessibilityInfo : [
    "Limited wheelchair accessibility - please contact us in advance",
    "Audio guides available for hearing impaired visitors",
    "Service animals are welcome",
    "Please inform us of any special requirements when booking"
  ],
  groupSize: tour.groupSize || { min: 1, max: tour.maxGroupSize || 20 },
  transportationDetails: tour.transportationDetails || "Meeting point instructions will be provided upon booking confirmation.",
  mealInfo: tour.mealInfo || "No meals included unless specified. Local restaurant recommendations available from your guide.",
  weatherPolicy: tour.weatherPolicy || "Tours operate rain or shine. In case of severe weather, tours may be rescheduled or refunded.",
  photoPolicy: tour.photoPolicy || "Photography is encouraged. Please respect photography restrictions at certain venues and other guests' privacy.",
  tipPolicy: tour.tipPolicy || "Gratuities are not included but are appreciated for exceptional service.",
  healthSafety: tour.healthSafety && tour.healthSafety.length > 0 ? tour.healthSafety : [
    "Enhanced safety protocols in place", "Hand sanitizer available",
    "First aid trained guides", "Emergency procedures established", "Local health guidelines followed"
  ],
  culturalInfo: tour.culturalInfo && tour.culturalInfo.length > 0 ? tour.culturalInfo : [
    "Learn about local history and culture", "Discover architectural highlights",
    "Understand local traditions and customs", "Experience authentic local atmosphere", "Professional guide commentary"
  ],
  seasonalVariations: tour.seasonalVariations || "Tour experience may vary by season. Check specific seasonal considerations when booking.",
  localCustoms: tour.localCustoms && tour.localCustoms.length > 0 ? tour.localCustoms : [
    "Arrive at meeting point 15 minutes early", "Respect local customs and dress codes",
    "Follow guide instructions at all times", "Be respectful of other tour participants",
    "Ask questions - guides love sharing knowledge!"
  ]
});

const defaultFAQs = [
  { question: "What happens if I'm late for the departure?", answer: "Please arrive 15 minutes before departure. Late arrivals cannot be accommodated due to strict departure schedules. No refunds are provided for missed departures due to tardiness." },
  { question: "Can dietary restrictions be accommodated?", answer: "Yes! We offer vegetarian options and can accommodate most dietary restrictions with advance notice. Please inform us at least 24 hours before your tour." },
  { question: "Is this tour suitable for children?", answer: "Absolutely! Children 4-13 receive discounted pricing, and children 0-3 travel free. The tour is family-friendly with safety measures in place." },
  { question: "What if the weather is bad?", answer: "Tours operate in most weather conditions. Only severe weather will result in cancellation with full refund." },
  { question: "Can I bring my own food or drinks?", answer: "Outside food and beverages policies vary by tour. Special dietary needs can be accommodated with advance notice." },
  { question: "Is the tour wheelchair accessible?", answer: "Accessibility varies by tour. Please contact us in advance to discuss specific needs and ensure we can accommodate your requirements." },
  { question: "Can I reschedule my booking?", answer: "Yes, bookings can be rescheduled up to 24 hours before departure subject to availability. Changes within 24 hours may incur additional fees." },
  { question: "Are professional photos available?", answer: "Professional photography services can be arranged for an additional fee. Please inquire when booking. Personal photography is encouraged throughout the tour." }
];

const ItineraryIcon = ({ iconType, className = "w-5 h-5" }: { iconType?: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    location: <MapPin className={className} />,
    transport: <Bus className={className} />,
    monument: <Mountain className={className} />,
    camera: <Camera className={className} />,
    food: <Utensils className={className} />,
    time: <Clock className={className} />,
    info: <Info className={className} />,
    activity: <Users className={className} />,
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
      <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50" aria-label="Close lightbox">
        <X size={32} />
      </button>
      <div className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img key={currentIndex} src={images[currentIndex]} alt={`Tour image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full object-contain rounded-lg" />
        </AnimatePresence>
      </div>
      <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors" aria-label="Previous image">
        <ChevronLeft size={28} />
      </button>
      <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors" aria-label="Next image">
        <ChevronRight size={28} />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full" onClick={(e) => e.stopPropagation()}>
        {currentIndex + 1} / {images.length}
      </div>
    </motion.div>
  );
};

// --- Tab Navigation ---

function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.pageYOffset : 0;
    const updateScroll = () => {
      const currentScrollY = window.pageYOffset;
      setIsVisible(lastScrollY > currentScrollY || currentScrollY < 100);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);
  return { isVisible };
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'itinerary', label: 'Itinerary', icon: Clock },
  { id: 'practical', label: 'What to Know', icon: Backpack },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'policies', label: 'Policies', icon: Shield },
  { id: 'cultural', label: 'Cultural Info', icon: Heart },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'faq', label: 'FAQ', icon: MessageCircle }
];

// --- Main Component ---

export default function ShowcaseClientPage({ tour, reviews, relatedTours, widgetConfig }: ShowcaseClientPageProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '4.9';

  const tourImages = [tour.image, ...(tour.images || [])].filter(Boolean) as string[];
  const enhancement = extractEnhancementData(tour);
  const faqs = tour.faq && tour.faq.length > 0 ? tour.faq : defaultFAQs;

  const { isVisible: isHeaderVisible } = useScrollDirection();

  // Section refs for scroll-based tab detection
  const overviewRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const practicalRef = useRef<HTMLDivElement>(null);
  const accessibilityRef = useRef<HTMLDivElement>(null);
  const policiesRef = useRef<HTMLDivElement>(null);
  const culturalRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const inViewOptions = { amount: 0.1 as const };
  const isOverviewInView = useInView(overviewRef, inViewOptions);
  const isItineraryInView = useInView(itineraryRef, inViewOptions);
  const isPracticalInView = useInView(practicalRef, inViewOptions);
  const isAccessibilityInView = useInView(accessibilityRef, inViewOptions);
  const isPoliciesInView = useInView(policiesRef, inViewOptions);
  const isCulturalInView = useInView(culturalRef, inViewOptions);
  const isReviewsInView = useInView(reviewsRef, inViewOptions);
  const isFaqInView = useInView(faqRef, inViewOptions);

  useEffect(() => {
    if (isFaqInView) setActiveTab('faq');
    else if (isReviewsInView) setActiveTab('reviews');
    else if (isCulturalInView) setActiveTab('cultural');
    else if (isPoliciesInView) setActiveTab('policies');
    else if (isAccessibilityInView) setActiveTab('accessibility');
    else if (isPracticalInView) setActiveTab('practical');
    else if (isItineraryInView) setActiveTab('itinerary');
    else if (isOverviewInView) setActiveTab('overview');
  }, [isOverviewInView, isItineraryInView, isPracticalInView, isAccessibilityInView, isPoliciesInView, isCulturalInView, isReviewsInView, isFaqInView]);

  const scrollToSection = (id: string) => {
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      overview: overviewRef, itinerary: itineraryRef, practical: practicalRef,
      accessibility: accessibilityRef, policies: policiesRef, cultural: culturalRef,
      reviews: reviewsRef, faq: faqRef,
    };
    refs[id]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll active tab into view
  useEffect(() => {
    const container = navRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`a[data-tab-id="${activeTab}"]`) as HTMLElement | null;
    if (!activeEl) return;
    const elRect = activeEl.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const elLeft = elRect.left - contRect.left + container.scrollLeft;
    const elRight = elLeft + elRect.width;
    if (elLeft < container.scrollLeft + 12) {
      container.scrollTo({ left: Math.max(0, elLeft - 12), behavior: 'smooth' });
    } else if (elRight > container.scrollLeft + container.clientWidth - 12) {
      container.scrollTo({ left: container.scrollLeft + (elRight - container.scrollLeft - container.clientWidth + 12), behavior: 'smooth' });
    }
  }, [activeTab]);

  // Mobile drawer for calendar widget
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;

    const ORG_ID = widgetConfig.orgId;
    const API_URL = widgetConfig.apiUrl;
    const PRICE = String(tour.price || tour.discountPrice || 125);
    const CURRENCY = '$';
    const PRIMARY_COLOR = '#D97706';

    if (!ORG_ID) return;
    if (document.querySelector('.foxes-mobile-drawer')) return;

    let productId: string | null = null;

    async function fetchProduct() {
      try {
        const res = await fetch(`${API_URL}/api/widget/products/${ORG_ID}`);
        if (res.ok) {
          const data = await res.json();
          const products = data.products || [];
          if (products.length > 0) { productId = products[0].id; updateDrawerContent(); }
        }
      } catch (e) { console.error('[Mobile Drawer] Failed to fetch product:', e); }
    }

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

    const container = document.createElement('div');
    container.className = 'foxes-mobile-drawer';

    const bar = document.createElement('div');
    bar.className = 'foxes-mobile-bar';
    bar.innerHTML = `
      <div class="foxes-mobile-bar-price">
        <span class="foxes-mobile-bar-current">${CURRENCY}${PRICE}</span>
        <span class="foxes-mobile-bar-unit">/ person</span>
      </div>
      <button class="foxes-mobile-bar-btn">Book Now</button>
    `;
    container.appendChild(bar);

    const overlay = document.createElement('div');
    overlay.className = 'foxes-mobile-overlay';
    container.appendChild(overlay);

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
      overlay.classList.add('open'); drawer.classList.add('open');
      document.body.style.overflow = 'hidden'; updateDrawerContent();
    }

    function closeDrawer() {
      overlay.classList.remove('open'); drawer.classList.remove('open');
      document.body.style.overflow = '';
    }

    bar.querySelector('.foxes-mobile-bar-btn')?.addEventListener('click', openDrawer);
    drawer.querySelector('.foxes-mobile-drawer-close')?.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    fetchProduct();

    return () => { container.remove(); style.remove(); };
  }, [widgetConfig, tour]);

  // Itinerary map query
  const mapQuery = enhancement.itinerary && enhancement.itinerary.length > 0
    ? enhancement.itinerary.filter((item: any) => item.location).map((item: any) => item.location).join('|') || tour.title
    : tour.title;

  const stickyTop = isHeaderVisible ? 'top-16 md:top-20' : 'top-0';

  return (
    <>
      <AnimatePresence>
        {isLightboxOpen && tourImages.length > 0 && (
          <Lightbox images={tourImages} selectedIndex={selectedImageIndex} onClose={() => setIsLightboxOpen(false)} />
        )}
      </AnimatePresence>

      <div className="pt-16 md:pt-20">
        {/* Breadcrumb */}
        <div className="bg-slate-50/50 py-3 border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex items-center gap-1.5 text-xs">
              <Link href="/" className="text-slate-500 hover:text-amber-600 transition-colors">Home</Link>
              <span className="text-slate-400">/</span>
              <Link href="/showcase" className="text-slate-500 hover:text-amber-600 transition-colors">Tours</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800 font-medium truncate max-w-[200px] md:max-w-none">{tour.title}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Tour Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              <div>
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
                        className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === index ? 'border-amber-600 scale-105 shadow' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Image src={image} alt={`${tour.title} image ${index + 1}`} width={80} height={64} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Title & Meta */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">{tour.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500 fill-current" />
                        <span className="font-semibold text-slate-800">{averageRating}</span>
                        <span className="text-slate-500">({reviews.length} reviews)</span>
                      </div>
                      {tour.duration && (
                        <div className="flex items-center gap-1"><Clock size={16} /><span>{tour.duration}</span></div>
                      )}
                      {destination && (
                        <div className="flex items-center gap-1"><MapPin size={16} /><span>{destination.name}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-extrabold text-amber-600">${tour.price || tour.discountPrice || 125}</p>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>
                </div>
              </div>

              {/* Sticky Tab Navigation */}
              <div className={`sticky ${stickyTop} z-20 -mx-4 sm:mx-0 transition-all duration-300 bg-white/30 backdrop-blur-md border-b border-white/20 shadow-lg rounded-xl`}>
                <div className="px-2 sm:px-4">
                  <div ref={navRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2 scroll-smooth" role="tablist">
                    {tabs.map((tab) => (
                      <a key={tab.id} href={`#${tab.id}`} data-tab-id={tab.id} role="tab" aria-selected={activeTab === tab.id}
                        onClick={(e) => { e.preventDefault(); scrollToSection(tab.id); }}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-amber-600'}`}>
                        <tab.icon size={18} />
                        {tab.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Overview Section */}
              <div ref={overviewRef} id="overview" className="space-y-8 scroll-mt-24">
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
                              <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{item}</span>
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
                              <Star size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                {tour.whatsNotIncluded && tour.whatsNotIncluded.length > 0 && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Not Included</h3>
                    <ul className="grid md:grid-cols-2 gap-3">
                      {tour.whatsNotIncluded.map((item: string, index: number) => (
                        <li key={index} className="flex items-center gap-3 text-gray-500">
                          <X size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                    <Calendar className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-slate-900">Free Cancellation</h3>
                    <p className="text-sm text-slate-600">{tour.cancellationPolicy || 'Up to 24 hours in advance'}</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                    <Users className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-slate-900">Group Friendly</h3>
                    <p className="text-sm text-slate-600">Perfect for all group sizes</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
                    <Smartphone className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-slate-900">Mobile Ticket</h3>
                    <p className="text-sm text-slate-600">Show on your smartphone</p>
                  </div>
                </div>
              </div>

              {/* Itinerary Section */}
              {enhancement.itinerary && enhancement.itinerary.length > 0 && (
                <div ref={itineraryRef} id="itinerary" className="space-y-6 scroll-mt-24">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock size={24} className="text-amber-600" />
                    Detailed Itinerary
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="relative order-2 lg:order-1">
                      <div className="absolute left-6 top-6 bottom-6 w-0.5 border-l-2 border-dashed border-slate-300" />
                      <div className="max-h-[600px] lg:max-h-[700px] overflow-y-auto pr-2">
                        {enhancement.itinerary.map((item: any, index: number) => (
                          <div key={index} className="relative flex items-start gap-4 pb-6 last:pb-0">
                            <div className="flex-shrink-0 relative z-10">
                              <div className={`absolute inset-0 rounded-full ${index === 0 ? 'bg-green-100 animate-pulse' : index === enhancement.itinerary!.length - 1 ? 'bg-red-100' : 'bg-blue-100'}`} style={{ transform: 'scale(1.3)' }} />
                              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${index === 0 ? 'bg-green-600' : index === enhancement.itinerary!.length - 1 ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
                                <ItineraryIcon iconType={item.icon} className="w-6 h-6" />
                              </div>
                            </div>
                            <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${index === 0 ? 'bg-green-50 text-green-700' : index === enhancement.itinerary!.length - 1 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {item.time}
                                  </span>
                                  {item.duration && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{item.duration}</span>}
                                </div>
                                {item.location && (
                                  <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                                    <MapPin size={12} /><span className="hidden md:inline">{item.location}</span>
                                  </div>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-800 mb-2 text-base">{item.title}</h4>
                              <p className="text-slate-600 text-sm leading-relaxed mb-3">{item.description}</p>
                              {item.includes && item.includes.length > 0 && (
                                <div className="border-t border-slate-100 pt-3 mt-3">
                                  <p className="text-xs font-semibold text-slate-700 mb-2">Includes:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.includes.map((include: string, i: number) => (
                                      <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Check size={12} />{include}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="relative order-1 lg:order-2 lg:sticky lg:top-24 h-[400px] lg:h-[700px]">
                      <div className="h-full rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg">
                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(mapQuery)}&zoom=12`} />
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Navigation size={16} className="text-blue-600" />
                            <span className="text-sm font-medium text-slate-800">Tour Route</span>
                          </div>
                          <button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(mapQuery)}`, '_blank')}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">
                            <Navigation size={12} />Open Maps
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Hidden ref if no itinerary */}
              {(!enhancement.itinerary || enhancement.itinerary.length === 0) && <div ref={itineraryRef} id="itinerary" className="hidden" />}

              {/* Practical Info Section */}
              <div ref={practicalRef} id="practical" className="space-y-8 scroll-mt-24">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Backpack size={24} className="text-blue-600" />
                  Practical Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Backpack size={20} className="text-blue-600" />What to Bring</h4>
                    <ul className="space-y-2">
                      {enhancement.whatToBring?.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Sun size={20} className="text-yellow-600" />What to Wear</h4>
                    <ul className="space-y-2">
                      {enhancement.whatToWear?.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
                {enhancement.physicalRequirements && (
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><Mountain size={20} />Physical Requirements</h4>
                    <p className="text-blue-800 text-sm leading-relaxed">{enhancement.physicalRequirements}</p>
                  </div>
                )}
                {enhancement.groupSize && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
                      <Users size={24} className="text-slate-600 mx-auto mb-2" />
                      <div className="font-bold text-lg text-slate-800">{enhancement.groupSize.min}-{enhancement.groupSize.max}</div>
                      <div className="text-sm text-slate-500">Participants</div>
                    </div>
                    <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
                      <Languages size={24} className="text-slate-600 mx-auto mb-2" />
                      <div className="font-bold text-lg text-slate-800">Multi</div>
                      <div className="text-sm text-slate-500">Languages</div>
                    </div>
                    <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
                      <Shield size={24} className="text-slate-600 mx-auto mb-2" />
                      <div className="font-bold text-lg text-slate-800">Safe</div>
                      <div className="text-sm text-slate-500">& Secure</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accessibility Section */}
              <div ref={accessibilityRef} id="accessibility" className="space-y-6 scroll-mt-24">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Accessibility size={24} className="text-purple-600" />
                  Accessibility & Special Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-purple-50 p-6 rounded-xl">
                    <h4 className="font-bold text-purple-900 mb-4">Accessibility Information</h4>
                    <ul className="space-y-3">
                      {enhancement.accessibilityInfo?.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-purple-800">
                          <Info size={16} className="text-purple-600 mt-0.5 flex-shrink-0" /><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-green-50 p-6 rounded-xl">
                    <h4 className="font-bold text-green-900 mb-4">Health & Safety Measures</h4>
                    <ul className="space-y-3">
                      {enhancement.healthSafety?.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-green-800">
                          <Shield size={16} className="text-green-600 mt-0.5 flex-shrink-0" /><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {enhancement.transportationDetails && (
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Bus size={20} className="text-blue-600" />Transportation Details</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">{enhancement.transportationDetails}</p>
                  </div>
                )}
              </div>

              {/* Policies Section */}
              <div ref={policiesRef} id="policies" className="space-y-6 scroll-mt-24">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Shield size={24} className="text-red-600" />
                  Policies
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-sky-50 p-6 rounded-xl">
                    <h4 className="font-bold text-sky-900 mb-3 flex items-center gap-2"><Umbrella size={20} className="text-sky-600" />Weather Policy</h4>
                    <p className="text-sky-800 text-sm leading-relaxed">{enhancement.weatherPolicy}</p>
                  </div>
                  <div className="bg-pink-50 p-6 rounded-xl">
                    <h4 className="font-bold text-pink-900 mb-3 flex items-center gap-2"><Camera size={20} className="text-pink-600" />Photography Policy</h4>
                    <p className="text-pink-800 text-sm leading-relaxed">{enhancement.photoPolicy}</p>
                  </div>
                  <div className="bg-yellow-50 p-6 rounded-xl">
                    <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2"><CreditCard size={20} className="text-yellow-600" />Gratuity Policy</h4>
                    <p className="text-yellow-800 text-sm leading-relaxed">{enhancement.tipPolicy}</p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-xl">
                    <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2"><Utensils size={20} className="text-orange-600" />Meal Information</h4>
                    <p className="text-orange-800 text-sm leading-relaxed">{enhancement.mealInfo}</p>
                  </div>
                </div>
              </div>

              {/* Cultural Section */}
              <div ref={culturalRef} id="cultural" className="space-y-6 scroll-mt-24">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Heart size={24} className="text-teal-600" />
                  Cultural Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-indigo-50 p-6 rounded-xl">
                    <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><Eye size={20} className="text-indigo-600" />Cultural Highlights</h4>
                    <ul className="space-y-2">
                      {enhancement.culturalInfo?.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-indigo-800">
                          <Star size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" /><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-teal-50 p-6 rounded-xl">
                    <h4 className="font-bold text-teal-900 mb-4 flex items-center gap-2"><Heart size={20} className="text-teal-600" />Local Customs & Etiquette</h4>
                    <ul className="space-y-2">
                      {enhancement.localCustoms?.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-teal-800">
                          <Info size={16} className="text-teal-600 mt-0.5 flex-shrink-0" /><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {enhancement.seasonalVariations && (
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Snowflake size={20} className="text-slate-600" />Seasonal Variations</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">{enhancement.seasonalVariations}</p>
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <div ref={reviewsRef} id="reviews" className="space-y-6 scroll-mt-24">
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
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
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
                              {review.createdAt && (
                                <p className="text-slate-400 text-xs mt-2">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">No reviews yet. Be the first to review this experience!</div>
                  )}
                </div>
              </div>

              {/* FAQ Section */}
              <div ref={faqRef} id="faq" className="space-y-4 scroll-mt-24">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <MessageCircle size={24} className="text-orange-600" />
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

              {/* Meeting Point */}
              {tour.meetingPoint && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Meeting point</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <MapPin className="text-amber-600 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-semibold text-slate-800">{tour.meetingPoint}</p>
                        <p className="text-sm text-slate-600 mt-1">Check-in 15 minutes before departure time</p>
                        <button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(tour.meetingPoint!)}`, '_blank')}
                          className="text-amber-600 hover:underline text-sm font-medium mt-2 inline-flex items-center gap-1">
                          <Navigation size={14} />Open in Google Maps
                        </button>
                      </div>
                    </div>
                    <div className="relative w-full h-[300px] rounded-lg overflow-hidden shadow-md border border-slate-200">
                      <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(tour.meetingPoint)}&zoom=15`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Related Tours */}
              {relatedTours.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedTours.map((relatedTour: any) => (
                      <Link key={relatedTour._id} href={`/showcase/${relatedTour.slug}`} className="group">
                        <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative">
                            {relatedTour.image && (
                              <Image src={relatedTour.image} alt={relatedTour.title} width={300} height={200}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-sm text-slate-800 mb-1 line-clamp-2">{relatedTour.title}</h3>
                            {relatedTour.duration && (
                              <div className="flex items-center gap-1 mb-1 text-xs text-slate-500">
                                <Clock size={12} /><span>{relatedTour.duration}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              {relatedTour.rating && (
                                <div className="flex items-center gap-1">
                                  <Star size={12} className="text-yellow-500 fill-current" />
                                  <span className="text-xs font-bold">{relatedTour.rating}</span>
                                </div>
                              )}
                              <span className="font-bold text-amber-600">${relatedTour.price || relatedTour.discountPrice || 99}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Booking Widget Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Price Header */}
                <div className="bg-white rounded-t-2xl border border-b-0 border-gray-200 p-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">${tour.price || tour.discountPrice || 125}</span>
                    <span className="text-gray-500">/ person</span>
                  </div>
                  <p className="text-gray-500 text-sm">Prices vary based on date and group size</p>
                </div>

                {/* Calendar Widget Embed */}
                <div id="foxes-embed-calendar" data-org-id={widgetConfig.orgId} data-product-id={widgetConfig.productId || ''}
                  data-api-url={widgetConfig.apiUrl} data-primary-color="#D97706" data-accent-color="#F59E0B"
                  className="min-h-[400px] bg-white border-x border-gray-200 [&_.fce-widget]:sticky [&_.fce-widget]:top-24" />

                {/* Trust Badges */}
                <div className="bg-gray-50 rounded-b-2xl border border-t-0 border-gray-200 p-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Shield className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Secure Booking</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Easy Payment</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Calendar className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Free Cancellation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Foxes Calendar Embed Widget Script */}
      <Script src={`${widgetConfig.apiUrl}/widget/foxes-calendar-embed.js`} strategy="lazyOnload"
        onLoad={() => {
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
    </>
  );
}
