'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Search, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

const DeferredAISearchWidget = dynamic(() => import('@/components/AISearchWidget'), {
  ssr: false,
});

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
  const timeoutRef = useRef<number | null>(null);
  const slides = images.length ? images : DEFAULT_IMAGES;

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;

    timeoutRef.current = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [autoplay, delay, index, slides.length]);

  const activeIndex = index % slides.length;
  const activeSlide = slides[activeIndex];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        key={`${activeSlide.desktop}-${activeIndex}`}
        className="absolute inset-0 h-full w-full transition-opacity duration-700 ease-in-out"
        style={{ transitionDuration: `${fadeMs}ms` }}
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
    </div>
  );
}

export default function HeroSectionStable({ initialSettings }: HeroSectionStableProps) {
  const locale = useLocale();
  const tHero = useTranslations('hero');
  const [aiWidgetEnabled, setAiWidgetEnabled] = useState(false);
  const [pendingAiOpen, setPendingAiOpen] = useState(false);
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

  useEffect(() => {
    if (!aiWidgetEnabled || !pendingAiOpen) return;

    const openDelays = [350, 800, 1400, 2200, 3200, 5000, 7500];
    const timeouts = openDelays.map((delay) => window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openAIAgent', { detail: { query: '' } }));
    }, delay));

    const clearPendingTimeout = window.setTimeout(() => {
      setPendingAiOpen(false);
    }, 8000);

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      window.clearTimeout(clearPendingTimeout);
    };
  }, [aiWidgetEnabled, pendingAiOpen]);

  const openAiWidget = () => {
    (window as any).__pendingAIOpenAgent = true;
    (window as any).__pendingAIOpenAgentQuery = '';
    setAiWidgetEnabled(true);
    setPendingAiOpen(true);
  };

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
              {heroMainText}
              {heroHighlightText && (
                <>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    {heroHighlightText}
                  </span>
                </>
              )}
            </h1>

            <p className="mx-auto mt-4 max-w-md text-base font-light drop-shadow sm:text-lg md:mx-0 md:text-xl">
              {heroSubtitleText}
            </p>

            <div className="mt-8 flex w-full justify-center md:justify-start lg:mt-10">
              <button
                type="button"
                onClick={openAiWidget}
                className="group relative w-full max-w-sm rounded-full border-2 border-white/30 bg-black/40 text-left shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all duration-300 hover:border-white/50 hover:bg-black/50 md:max-w-xl"
                aria-label={currentSuggestion}
              >
                <span className="flex items-center gap-3 px-4 py-4 md:px-5 md:py-5">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-400 to-purple-500 shadow-lg shadow-blue-400/30 md:h-10 md:w-10">
                    <Search className="h-4 w-4 text-white md:h-5 md:w-5" strokeWidth={2.5} />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-gradient-to-br from-green-400 to-emerald-500 shadow-md" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/80 md:text-base">
                    {currentSuggestion}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-orange-500 shadow-lg md:h-10 md:w-10">
                    <Sparkles className="h-4 w-4 text-white md:h-5 md:w-5" strokeWidth={2.5} />
                  </span>
                </span>
              </button>
            </div>

            {initialSettings?.trustIndicators?.isVisible !== false && (
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/80 md:justify-start">
                <span>{travelersText}</span>
                <span>{ratingStarsText}</span>
                <span>{ratingScoreText}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {aiWidgetEnabled && <DeferredAISearchWidget />}
    </>
  );
}
