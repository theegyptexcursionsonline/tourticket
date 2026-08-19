'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import HostedAISearchEntry from '@/components/HostedAISearchEntry';

interface HeroSettings {
  backgroundImages?: {
    desktop: string;
    mobile?: string;
    alt: string;
    isActive?: boolean;
  }[];
  title?: {
    main?: string;
    highlight?: string;
  };
  searchSuggestions?: string[];
  trustIndicators?: {
    travelers?: string;
    rating?: string;
    ratingText?: string;
    isVisible?: boolean;
  };
  overlaySettings?: {
    opacity?: number;
    gradientType?: 'dark' | 'light' | 'custom';
    customGradient?: string;
  };
  animationSettings?: {
    slideshowSpeed?: number;
    fadeSpeed?: number;
    enableAutoplay?: boolean;
  };
  metaDescription?: string;
}

interface HeroSectionStableProps {
  initialSettings?: HeroSettings | null;
}

const DEFAULT_IMAGES: NonNullable<HeroSettings['backgroundImages']> = [
  { desktop: '/hero2.jpg', alt: 'Pyramids of Giza at sunrise', isActive: true },
  { desktop: '/hero1.jpg', alt: 'Felucca on the Nile at sunset', isActive: false },
  { desktop: '/hero3.jpg', alt: 'Luxor temple columns at golden hour', isActive: false },
];

function useSlidingText(texts: string[], interval = 3000, fallbackText: string) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (texts.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % texts.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [texts.length, interval]);

  return texts[currentIndex] || texts[0] || fallbackText;
}

function BackgroundSlideshow({
  images,
  delay,
  fadeMs,
  autoplay,
}: {
  images: NonNullable<HeroSettings['backgroundImages']>;
  delay: number;
  fadeMs: number;
  autoplay: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const slides = images.length ? images : DEFAULT_IMAGES;

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;

    timeoutRef.current = window.setTimeout(() => {
      setPreviousIndex(index % slides.length);
      setIndex((current) => (current + 1) % slides.length);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [autoplay, delay, index, slides.length]);

  useEffect(() => {
    if (previousIndex === null) return;

    fadeTimeoutRef.current = window.setTimeout(() => {
      setPreviousIndex(null);
      fadeTimeoutRef.current = null;
    }, fadeMs);

    return () => {
      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };
  }, [fadeMs, previousIndex]);

  const activeIndex = index % slides.length;
  const activeSlide = slides[activeIndex];
  const previousSlide = previousIndex === null ? null : slides[previousIndex % slides.length];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {previousSlide && previousIndex !== activeIndex && (
        <div
          key={`previous-${previousSlide.desktop}-${previousIndex}`}
          data-hero-slide="previous"
          className="absolute inset-0 h-full w-full"
        >
          <Image
            src={previousSlide.mobile || previousSlide.desktop}
            alt={previousSlide.alt}
            fill
            quality={75}
            sizes="100vw"
            loading="lazy"
            className="object-cover"
          />
        </div>
      )}

      <div
        key={`active-${activeSlide.desktop}-${activeIndex}`}
        data-hero-slide="active"
        className={previousSlide ? 'hero-slide-fade-in absolute inset-0 h-full w-full' : 'absolute inset-0 h-full w-full'}
        style={previousSlide ? { animationDuration: `${fadeMs}ms` } : undefined}
      >
        <Image
          src={activeSlide.mobile || activeSlide.desktop}
          alt={activeSlide.alt}
          fill
          priority={activeIndex === 0}
          quality={75}
          sizes="100vw"
          loading={activeIndex === 0 ? 'eager' : 'lazy'}
          className="object-cover"
        />
      </div>

      <style jsx>{`
        .hero-slide-fade-in {
          animation-name: hero-slide-fade-in;
          animation-timing-function: ease-in-out;
          animation-fill-mode: both;
        }

        @keyframes hero-slide-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function HeroSectionStable({ initialSettings }: HeroSectionStableProps) {
  const locale = useLocale();
  const tHero = useTranslations('hero');
  const isEnglishLocale = locale === 'en';
  const images = initialSettings?.backgroundImages?.length
    ? initialSettings.backgroundImages
    : DEFAULT_IMAGES;
  const overlay = initialSettings?.overlaySettings || {};
  const animation = initialSettings?.animationSettings || {};
  const searchSuggestions =
    isEnglishLocale && initialSettings?.searchSuggestions?.length
      ? initialSettings.searchSuggestions
      : [tHero('searchPlaceholder')];
  const currentSuggestion = useSlidingText(searchSuggestions, 3000, tHero('searchPlaceholder'));

  const heroMainText = isEnglishLocale
    ? (initialSettings?.title?.main || tHero('defaultTitle'))
    : tHero('defaultTitle');
  const heroHighlightText = isEnglishLocale
    ? (initialSettings?.title?.highlight || tHero('defaultHighlight'))
    : tHero('defaultHighlight');
  const heroSubtitleText = isEnglishLocale
    ? (initialSettings?.metaDescription || tHero('subtitle'))
    : tHero('subtitle');
  const travelersText = isEnglishLocale
    ? (initialSettings?.trustIndicators?.travelers || tHero('travelers'))
    : tHero('travelers');
  const ratingStarsText = isEnglishLocale
    ? (initialSettings?.trustIndicators?.ratingText || tHero('ratingStars'))
    : tHero('ratingStars');
  const ratingScoreText = isEnglishLocale
    ? (initialSettings?.trustIndicators?.rating || tHero('ratingScore'))
    : tHero('ratingScore');

  const overlayOpacity = overlay.opacity ?? 0.6;
  const overlayBackground = overlay.gradientType === 'custom'
    ? overlay.customGradient
    : overlay.gradientType === 'light'
      ? `linear-gradient(to bottom right, rgba(255,255,255,${overlayOpacity}), rgba(255,255,255,${overlayOpacity * 0.7}))`
      : `linear-gradient(to bottom right, rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${overlayOpacity * 0.7}))`;

  return (
    <>
      <section className="relative flex h-screen min-h-[600px] max-h-[900px] w-full items-center justify-center overflow-visible text-white font-sans">
        <BackgroundSlideshow
          images={images}
          delay={(animation.slideshowSpeed || 6) * 1000}
          fadeMs={animation.fadeSpeed || 900}
          autoplay={animation.enableAutoplay !== false}
        />

        <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: overlayBackground }} />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-center px-4 text-center sm:px-6 md:items-start md:text-left lg:px-8">
          <div className="relative max-w-xl">
            <h1 className="text-4xl font-extrabold uppercase leading-tight tracking-wide drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">{heroMainText}</span>
              {heroHighlightText && (
                <span className="mt-1 block text-3xl font-bold text-white/90 sm:text-4xl md:text-5xl lg:text-6xl">
                  {heroHighlightText}
                </span>
              )}
            </h1>

            <p className="mx-auto mt-4 max-w-md text-base font-normal leading-relaxed text-white/90 drop-shadow sm:text-lg md:mx-0">
              {heroSubtitleText}
            </p>

            <HostedAISearchEntry placeholder={currentSuggestion} />

            {initialSettings?.trustIndicators?.isVisible !== false && (
              <div
                data-testid="hero-trust-indicators"
                className="mx-auto mt-6 inline-flex items-center justify-center divide-x divide-white/25 rounded-full border border-white/30 bg-slate-950/45 px-2 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-md sm:text-base md:mx-0 md:justify-start"
              >
                <span className="px-3">{travelersText}</span>
                <span className="px-3 tracking-wide" aria-label={ratingStarsText}>{ratingStarsText}</span>
                <span className="px-3">{ratingScoreText}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
