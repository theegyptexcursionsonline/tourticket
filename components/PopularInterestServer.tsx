// components/PopularInterestServer.tsx
'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Star, Sparkles, TrendingUp } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectCoverflow } from 'swiper/modules';
import { useLocale, useTranslations } from 'next-intl';
import { isRTL } from '@/i18n/config';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';

// --- TYPES ---
interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
}

interface CategoryPage {
  _id: string;
  slug: string;
  pageType: 'category';
  isPublished: boolean;
  heroImage?: string;
  categoryId?: {
    name: string;
    slug: string;
  };
}

interface PopularInterestServerProps {
  interests: Interest[];
  categoryPages: CategoryPage[];
}

type PopularInterestsTranslator = (key: string, values?: Record<string, unknown>) => string;

// Default fallback image for categories without images
const DEFAULT_CATEGORY_IMAGE = '/placeholder-category.jpg';

// --- COMPONENTS ---
const InterestCard = ({
  interest,
  categoryPage,
  t,
  rtl
}: {
  interest: Interest;
  categoryPage?: CategoryPage;
  t: PopularInterestsTranslator;
  rtl: boolean;
}) => {
  const linkUrl = categoryPage?.isPublished
    ? `/category/${categoryPage.slug}`
    : interest.type === 'attraction'
      ? `/attraction/${interest.slug}`
      : `/categories/${interest.slug}`;

  // Only use actual database images - no mock images
  const imageUrl = categoryPage?.heroImage || interest.image || DEFAULT_CATEGORY_IMAGE;

  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={linkUrl}
      className="group relative block overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
      style={{ width: '100%', height: 420 }}
    >
      {/* Image */}
      <div className="relative w-full h-full">
        <Image
          src={imageUrl}
          alt={interest.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Featured Badge */}
      {interest.featured && (
        <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {t('featuredBadge')}
        </div>
      )}

      {/* Trending Badge */}
      {interest.products > 50 && (
        <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {t('trendingBadge')}
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
          {interest.name}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-white/90 font-medium">
            {interest.products} {interest.products === 1 ? t('experience') : t('experiences')}
          </p>
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
            <Arrow className="w-5 h-5 text-white transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const EmptyState = ({ t, rtl }: { t: PopularInterestsTranslator; rtl: boolean }) => {
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
  <div className="text-center py-12">
    <Star className="w-12 h-12 text-slate-400 mx-auto mb-3" />
    <h3 className="text-xl font-bold text-white mb-2">{t('emptyTitle')}</h3>
    <p className="text-slate-300 mb-4">{t('emptySubtitle')}</p>
    <Link
      href="/tours"
      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
    >
      {t('browseAllTours')} <Arrow className="w-4 h-4" />
    </Link>
  </div>
  );
};

// --- MAIN COMPONENT ---
export default function PopularInterestServer({ interests, categoryPages }: PopularInterestServerProps) {
  const t = useTranslations('popularInterests');
  const locale = useLocale();
  const rtl = isRTL(locale);
  const CtaArrow = rtl ? ArrowLeft : ArrowRight;

  const getCategoryPage = (interest: Interest): CategoryPage | undefined => {
    return categoryPages.find(page => {
      if (!page.isPublished || page.pageType !== 'category') return false;

      if (page.categoryId) {
        const categoryName = page.categoryId.name;
        const categorySlug = page.categoryId.slug;

        return categoryName.toLowerCase() === interest.name.toLowerCase() ||
               categorySlug.toLowerCase() === interest.slug?.toLowerCase();
      }

      return false;
    });
  };

  if (interests.length === 0) return <EmptyState t={t} rtl={rtl} />;

  return (
    <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-12 sm:py-16 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4 max-w-[1400px]">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 md:mb-14">
          <div className="inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4" />
            <span className="text-xs sm:text-sm font-bold">{t('sectionBadge')}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
          {t('sectionTitle')}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
            {t('sectionSubtitle')}
          </p>
        </div>

        {/* Carousel */}
        <Swiper
          modules={[Navigation, Autoplay, EffectCoverflow]}
          spaceBetween={30}
          slidesPerView={1}
          loop={true}
          navigation={true}
          centeredSlides={true}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          effect="coverflow"
          coverflowEffect={{
            rotate: 10,
            stretch: 0,
            depth: 100,
            modifier: 1.5,
            slideShadows: false,
          }}
          breakpoints={{
            640: { slidesPerView: 1.5, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 2.5, spaceBetween: 28 },
            1280: { slidesPerView: 3, spaceBetween: 32 },
          }}
          className="popular-interests-swiper !pb-12"
        >
          {interests.map((interest) => {
            const categoryPage = getCategoryPage(interest);
            return (
              <SwiperSlide key={interest._id}>
                <InterestCard interest={interest} categoryPage={categoryPage} t={t} rtl={rtl} />
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* CTA */}
        <div className="text-center mt-8 sm:mt-10 md:mt-12 px-4">
          <Link
            href="/interests"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-xl text-sm sm:text-base font-bold hover:bg-slate-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            {t('exploreAll')}
            <CtaArrow className="w-4 sm:w-5 h-4 sm:h-5" />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .swiper-button-next,
        .swiper-button-prev {
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          transition: all 0.3s ease;
        }

        /* Hide navigation buttons on mobile */
        @media (max-width: 768px) {
          .swiper-button-next,
          .swiper-button-prev {
            display: none;
          }
        }

        .swiper-button-next:hover,
        .swiper-button-prev:hover {
          background-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .swiper-button-next::after,
        .swiper-button-prev::after {
          font-size: 20px;
        }

        /* Override global RTL Swiper icon flip only for this carousel */
        [dir="rtl"] .popular-interests-swiper .swiper-button-next,
        [dir="rtl"] .popular-interests-swiper .swiper-button-prev {
          transform: none !important;
        }
      `}</style>
    </section>
  );
}
