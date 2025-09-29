'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, AlertCircle, Star, Users } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

// --- TYPES & INTERFACES ---
interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
}

// --- IMAGE MAPPING ---
const getInterestImage = (name: string): string => {
  const lowerName = name.toLowerCase();

  const imageMap: { [key: string]: string } = {
    fun: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
    family: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop',
    sightseeing: 'https://images.unsplash.com/photo-1555881698-6bfe5f815071?w=600&h=400&fit=crop',
    historical: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop',
    bus: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop',
    water: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop',
    nightlife: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
    cultural: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&h=400&fit=crop',
    adventure: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
    luxury: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
  };

  for (const [key, url] of Object.entries(imageMap)) {
    if (lowerName.includes(key)) return url;
  }

  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop';
};

// --- SUB-COMPONENTS ---
const InterestCard = ({ interest }: { interest: Interest }) => {
  const linkUrl =
    interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`;
  const imageUrl = interest.image || getInterestImage(interest.name);

  return (
    <Link
      href={linkUrl}
      aria-label={`Open ${interest.name}`}
      className="group relative block overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex-shrink-0"
      style={{ width: 320, height: 380 }}
    >
      {/* Image */}
      <div className="relative w-full h-full overflow-hidden rounded-2xl">
        <Image
          src={imageUrl}
          alt={interest.name}
          fill
          unoptimized // avoid requiring next.config for external domains; remove if you have domains configured
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 320px, 420px"
          placeholder="empty"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Subtle hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />

        {/* Border Effect */}
        <div className="absolute inset-0 rounded-2xl border-4 border-transparent group-hover:border-cyan-400 transition-all duration-300 pointer-events-none" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg transform transition-all duration-300 group-hover:bg-white">
          <h3 className="text-lg font-bold text-slate-900 mb-1 uppercase tracking-wide">{interest.name}</h3>
          <p className="text-sm text-slate-700 font-medium">{interest.products} products</p>
        </div>
      </div>

      {/* Featured Badge */}
      {interest.featured && (
        <div
          className="absolute top-4 right-4 z-20 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
          aria-hidden
        >
          Featured
        </div>
      )}
    </Link>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-8">
    {[0, 1].map((rowIndex) => (
      <div key={rowIndex} className="flex gap-5 px-4 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse"
            style={{ width: 320, height: 380 }}
            role="status"
            aria-hidden={false}
          >
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-white/90 rounded-xl p-4">
                <div className="h-6 bg-slate-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const InfoState = ({
  icon,
  title,
  message,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  children?: React.ReactNode;
}) => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-500 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-600 max-w-md mx-auto mb-6">{message}</p>
    {children}
  </div>
);

// --- MAIN COMPONENT ---
export default function PopularInterests(): JSX.Element {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch('/api/interests');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!mounted) return;

        if (data && (Array.isArray(data) || Array.isArray(data.data))) {
          // Accept both direct array or { success, data } shapes
          const items: Interest[] = Array.isArray(data) ? data : data.data;
          setInterests(items);
        } else if (data && data.success && Array.isArray(data.data)) {
          setInterests(data.data);
        } else {
          throw new Error(data?.error || 'Invalid response format from API');
        }
      } catch (err: any) {
        console.error('Error fetching interests:', err);
        if (!mounted) return;
        setError(err?.message || 'Failed to load content from the server.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  // Split interests into two rows
  const midPoint = Math.ceil(interests.length / 2);
  const firstRow = interests.slice(0, midPoint);
  const secondRow = interests.slice(midPoint);

  const renderContent = () => {
    if (loading) return <LoadingSkeleton />;

    if (error) {
      return <InfoState icon={<AlertCircle size={32} />} title="Error Loading Content" message={error} />;
    }

    if (interests.length === 0) {
      return (
        <InfoState
          icon={<Star size={32} />}
          title="No Experiences Found"
          message="We're busy crafting new adventures. Please check back soon for exciting new options!"
        >
          <Link
            href="/tours"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Browse All Tours <ArrowRight className="w-4 h-4" />
          </Link>
        </InfoState>
      );
    }

    return (
      <div className="space-y-8">
        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={20}
          slidesPerView={1}
          loop={true}
          navigation={true}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          breakpoints={{
            640: {
              slidesPerView: 1.2,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 2.2,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 24,
            },
            1280: {
              slidesPerView: 3.5,
              spaceBetween: 28,
            },
          }}
          aria-label="Popular interests slider - row 1"
          className="!pb-8 !px-4"
        >
          {firstRow.map((interest) => (
            <SwiperSlide key={interest._id}>
              <InterestCard interest={interest} />
            </SwiperSlide>
          ))}
        </Swiper>

        {secondRow.length > 0 && (
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            loop={true}
            navigation={true}
            autoplay={{
              delay: 4200,
              disableOnInteraction: false,
              reverseDirection: true,
            }}
            breakpoints={{
              640: {
                slidesPerView: 1.2,
                spaceBetween: 16,
              },
              768: {
                slidesPerView: 2.2,
                spaceBetween: 20,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 24,
              },
              1280: {
                slidesPerView: 3.5,
                spaceBetween: 28,
              },
            }}
            aria-label="Popular interests slider - row 2"
            className="!pb-8 !px-4"
          >
            {secondRow.map((interest) => (
              <SwiperSlide key={interest._id}>
                <InterestCard interest={interest} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    );
  };

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-20 sm:py-28 overflow-hidden">
      <div className="container mx-auto px-4 max-w-[1400px]">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Find the Right Interest <br className="hidden sm:inline" />
            for You
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
            Explore curated experiences and discover the best of Egypt tailored to your unique tastes.
          </p>
        </div>

        {/* Content */}
        {renderContent()}

        {/* CTA Section */}
        {!loading && !error && interests.length > 0 && (
          <div className="mt-20">
            <div className="max-w-4xl mx-auto p-8 sm:p-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100 shadow-xl">
              <div className="text-center">
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Need a Custom Itinerary?</h3>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                  Our local travel experts are here to craft your dream Egyptian adventure with personalized
                  recommendations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/tours"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    View All Experiences <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-blue-300 text-blue-700 font-bold rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
                  >
                    Contact an Expert <Users className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* Swiper navigation styling */
        .swiper-button-next,
        .swiper-button-prev {
          color: #0f172a;
          background-color: rgba(255, 255, 255, 0.95);
          border-radius: 9999px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.24s ease;
          top: 45%;
        }

        .swiper-button-next:hover,
        .swiper-button-prev:hover {
          transform: scale(1.05);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03);
        }

        .swiper-button-prev {
          left: 10px;
        }

        .swiper-button-next {
          right: 10px;
        }

        .swiper-wrapper {
          align-items: flex-start; /* keep cards aligned to top when different heights exist */
        }
      `}</style>
    </section>
  );
}