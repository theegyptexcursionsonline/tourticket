'use client';

import dynamic from 'next/dynamic';
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { Category, Tour } from '@/types';

const IcebarPromo = dynamic(() => import('@/components/IcebarPromo'), { ssr: false });
const FeaturedToursServer = dynamic(() => import('@/components/FeaturedToursServer'), { ssr: false });
const PopularInterestServer = dynamic(() => import('@/components/PopularInterestServer'), { ssr: false });
const InterestGridServer = dynamic(() => import('@/components/InterestGridServer'), { ssr: false });
const DayTripsServer = dynamic(() => import('@/components/DayTripsServer'), { ssr: false });
const AboutUs = dynamic(() => import('@/components/AboutUs'), { ssr: false });
const Reviews = dynamic(() => import('@/components/Reviews'), { ssr: false });
const FAQ = dynamic(() => import('@/components/FAQ'), { ssr: false });
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false });
const HomeBlogSection = dynamic(() => import('@/components/HomeBlogSection'), { ssr: false });

interface HomeDeferredSectionsProps {
  tours: Tour[];
  featuredInterests: Array<{
    _id: string;
    type: 'category' | 'attraction';
    name: string;
    slug: string;
    products: number;
    featured?: boolean;
    image?: string;
  }>;
  categoryPages: Array<{
    _id: string;
    slug: string;
    pageType: 'category';
    isPublished: boolean;
    heroImage?: string;
    categoryId?: { name: string; slug: string };
  }>;
  categories: Category[];
  dayTrips: Tour[];
}

export default function HomeDeferredSections({
  tours,
  featuredInterests,
  categoryPages,
  categories,
  dayTrips,
}: HomeDeferredSectionsProps) {
  const isMobile = useIsMobileViewport();
  const { ready: featuredReady, ref: featuredRef } = useInViewOnce<HTMLDivElement>('250px 0px');
  const { ready: popularReady, ref: popularRef } = useInViewOnce<HTMLDivElement>('220px 0px');
  const { ready: categoriesReady, ref: categoriesRef } = useInViewOnce<HTMLDivElement>('200px 0px');
  const { ready: dayTripsReady, ref: dayTripsRef } = useInViewOnce<HTMLDivElement>('180px 0px');
  const { ready: infoReady, ref: infoRef } = useInViewOnce<HTMLDivElement>('160px 0px');
  const featuredTours = isMobile ? tours.slice(0, 8) : tours;
  const popularInterests = isMobile ? featuredInterests.slice(0, 8) : featuredInterests;
  const interestCategories = isMobile ? categories.slice(0, 10) : categories;
  const featuredDayTrips = isMobile ? dayTrips.slice(0, 8) : dayTrips;

  return (
    <>
      {featuredReady ? (
        <>
          <IcebarPromo />
          <FeaturedToursServer tours={featuredTours} />
        </>
      ) : (
        <DeferredSentinel ref={featuredRef} minHeight="40vh" />
      )}

      {featuredReady && (
        popularReady ? (
          <PopularInterestServer interests={popularInterests} categoryPages={categoryPages} />
        ) : (
          <DeferredSentinel ref={popularRef} minHeight="28vh" />
        )
      )}

      {popularReady && (
        categoriesReady ? (
          <InterestGridServer categories={interestCategories} />
        ) : (
          <DeferredSentinel ref={categoriesRef} minHeight="24vh" />
        )
      )}

      {categoriesReady && (
        dayTripsReady ? (
          <DayTripsServer tours={featuredDayTrips} />
        ) : (
          <DeferredSentinel ref={dayTripsRef} minHeight="24vh" />
        )
      )}

      {dayTripsReady && (
        infoReady ? (
          <>
            <AboutUs />
            <Reviews />
            <FAQ />
            <HomeBlogSection />
            <Footer />
          </>
        ) : (
          <DeferredSentinel ref={infoRef} minHeight="30vh" />
        )
      )}
    </>
  );
}

function useIsMobileViewport() {
  // Hydrate from the same mobile-safe value emitted by SSR, then reconcile to
  // the actual viewport in the effect below.
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function useInViewOnce<T extends HTMLElement>(rootMargin: string) {
  const [ready, setReady] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (ready) return;

    let observer: IntersectionObserver | undefined;
    let removeScrollListener: (() => void) | undefined;
    let cancelScheduledMount: (() => void) | undefined;
    let mountScheduled = false;

    const showSection = () => {
      if (mountScheduled) return;
      mountScheduled = true;
      cancelScheduledMount = scheduleSectionMount(() => setReady(true));
    };
    const node = ref.current;

    if ('IntersectionObserver' in window && node) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            showSection();
          }
        },
        { rootMargin }
      );
      observer.observe(node);
    } else {
      const handleScroll = () => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        if (rect.top < window.innerHeight + parseRootMargin(rootMargin)) {
          showSection();
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      removeScrollListener = () => window.removeEventListener('scroll', handleScroll);
    }

    return () => {
      if (observer) observer.disconnect();
      if (removeScrollListener) removeScrollListener();
      if (cancelScheduledMount) cancelScheduledMount();
    };
  }, [ready, rootMargin]);

  return { ready, ref };
}

function scheduleSectionMount(callback: () => void) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (handler: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (idleWindow.requestIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout: 600 });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, 32);
  return () => window.clearTimeout(timeoutId);
}

function parseRootMargin(rootMargin: string) {
  const firstValue = rootMargin.split(/\s+/)[0] || '0';
  const parsed = Number.parseInt(firstValue, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface DeferredSentinelProps {
  minHeight: string;
}

const DeferredSentinel = forwardRef<HTMLDivElement, DeferredSentinelProps>(function DeferredSentinel(
  { minHeight },
  ref
) {
  return <div ref={ref} aria-hidden="true" className="bg-white" style={{ minHeight }} />;
});

DeferredSentinel.displayName = 'DeferredSentinel';
