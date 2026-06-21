'use client';

import dynamic from 'next/dynamic';
import { forwardRef, useEffect, useRef, useState } from 'react';

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
  tours: any[];
  featuredInterests: any[];
  categoryPages: any[];
  categories: any[];
  dayTrips: any[];
}

export default function HomeDeferredSections({
  tours,
  featuredInterests,
  categoryPages,
  categories,
  dayTrips,
}: HomeDeferredSectionsProps) {
  const isMobile = useIsMobileViewport();
  const showFeatured = useInViewOnce<HTMLDivElement>('500px 0px');
  const showPopular = useInViewOnce<HTMLDivElement>('450px 0px');
  const showCategories = useInViewOnce<HTMLDivElement>('400px 0px');
  const showDayTrips = useInViewOnce<HTMLDivElement>('350px 0px');
  const showInfo = useInViewOnce<HTMLDivElement>('300px 0px');
  const featuredTours = isMobile ? tours.slice(0, 8) : tours;
  const popularInterests = isMobile ? featuredInterests.slice(0, 8) : featuredInterests;
  const interestCategories = isMobile ? categories.slice(0, 10) : categories;
  const featuredDayTrips = isMobile ? dayTrips.slice(0, 8) : dayTrips;

  return (
    <>
      {showFeatured.ready ? (
        <>
          <IcebarPromo />
          <FeaturedToursServer tours={featuredTours as any} />
        </>
      ) : (
        <DeferredSentinel ref={showFeatured.ref} minHeight="40vh" />
      )}

      {showFeatured.ready && (
        showPopular.ready ? (
          <PopularInterestServer interests={popularInterests as any} categoryPages={categoryPages as any} />
        ) : (
          <DeferredSentinel ref={showPopular.ref} minHeight="28vh" />
        )
      )}

      {showPopular.ready && (
        showCategories.ready ? (
          <InterestGridServer categories={interestCategories as any} />
        ) : (
          <DeferredSentinel ref={showCategories.ref} minHeight="24vh" />
        )
      )}

      {showCategories.ready && (
        showDayTrips.ready ? (
          <DayTripsServer tours={featuredDayTrips as any} />
        ) : (
          <DeferredSentinel ref={showDayTrips.ref} minHeight="24vh" />
        )
      )}

      {showDayTrips.ready && (
        showInfo.ready ? (
          <>
            <AboutUs />
            <Reviews />
            <FAQ />
            <HomeBlogSection />
            <Footer />
          </>
        ) : (
          <DeferredSentinel ref={showInfo.ref} minHeight="30vh" />
        )
      )}
    </>
  );
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(max-width: 767px)').matches;
  });

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

    const showSection = () => setReady(true);
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
    };
  }, [ready, rootMargin]);

  return { ready, ref };
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
