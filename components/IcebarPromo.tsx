'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';

/**
 * EgyptPromo - Ultra Premium
 * - Responsive <picture> with srcset + LQIP
 * - Parallax (disabled with prefers-reduced-motion)
 * - Cinematic overlay + grain
 * - Entrance animations + accessible focus states
 *
 * CONTROL: change the top constants to control image/text/links
 */

export default function EgyptPromo() {
  // -----------------------
  // 🔧 CONTROL AREA - update image paths, text, links here
  // Put responsive images under /public/images/
  // -----------------------
  const imgSmall = '/pyramid2.jpg';   // for <= 640
  const imgMedium = '/pyramid2.jpg'; // for <= 1024
  const imgLarge = '/pyramid2.jpg';  // for >= 1024
  const imgLQ = '/pyramid2.jpg';       // tiny blurred placeholder (very small file)



  const heading = 'Discover Egypt';
  const subheading = 'Timeless wonders, Nile sunsets & ancient stories';
  const description =
    'Unveil the wonders of the Pharaohs — sail the Nile, explore the pyramids, and feel history come alive with curated luxury experiences.';
  const primaryHref = '/egypt';
  const primaryText = 'Explore Egypt';

  const enableParallax = true;
  // -----------------------

  const bgRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScrollRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  // Respect user reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Parallax (uses requestAnimationFrame, no heavy libs)
  useEffect(() => {
    if (!enableParallax || prefersReducedMotion) return;

    const onScroll = () => {
      lastScrollRef.current = window.scrollY || window.pageYOffset;
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(updateParallax);
    };

    const updateParallax = () => {
      const scroll = lastScrollRef.current;
      const el = bgRef.current;
      if (el) {
        // subtle parallax, clamped
        const y = Math.max(Math.min(scroll * 0.12, 120), -40);
        el.style.transform = `translate3d(0, ${y}px, 0)`;
      }
      rafRef.current = null;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enableParallax, prefersReducedMotion]);

  // entrance animation trigger
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-black">
      {/* Background wrapper */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Picture for responsive images + LQIP via inline style on wrapper */}
        <div
          ref={bgRef}
          className="absolute inset-0 will-change-transform transition-transform duration-700 ease-out"
          aria-hidden
        >
          <picture>
            {/* Modern browsers will pick the best image from the srcset */}
            <source srcSet={`${imgLarge} 2048w, ${imgMedium} 1024w, ${imgSmall} 640w`} sizes="(min-width: 1024px) 1200px, 100vw" />
            {/* img tag used so we can lazy-load and have onLoad */}
            <img
              ref={imgRef}
              src={imgMedium}
              alt="Pyramids and desert landscape in Egypt"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover block"
              style={{
                // LQIP background while the large image loads
                backgroundImage: `url("${imgLQ}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'none',
              }}
              onLoad={() => {
                // ensure loaded state triggers entrance animations
                setLoaded(true);
              }}
            />
          </picture>

          {/* Cinematic overlays - gradient + vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.55)_0%,_rgba(0,0,0,0.0)_45%)] pointer-events-none" />

          {/* subtle grain */}
          <div className="absolute inset-0 bg-noise opacity-8 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 py-28 md:py-36">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div
            className={`transform transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="block text-amber-400/95">{heading}</span>
              <span className="block text-white text-2xl sm:text-3xl font-medium mt-2">{subheading}</span>
            </h2>

            <p className="mt-6 text-lg sm:text-xl text-amber-100/95 max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={primaryHref}
                className="inline-flex items-center gap-3 px-12 py-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold shadow-2xl transform transition hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
                aria-label={primaryText}
              >
                <span>{primaryText}</span>
                <ArrowRight size={18} />
              </Link>

           
            </div>
          </div>
        </div>
      </div>

      {/* noscript fallback: static hero with LQ image + overlay */}
      <noscript>
        <div className="absolute inset-0">
          <img src={imgMedium} alt="Pyramids of Egypt" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      </noscript>

      {/* Decorative elements & CSS */}
      <style jsx global>{`
        /* film grain (tiny pattern) */
        .bg-noise {
          background-image:
            radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px);
          background-position: 0 0, 8px 8px;
          background-size: 16px 16px;
        }

        /* ensure full-bleed img fills container */
        picture img { width: 100%; height: 100%; object-fit: cover; }

        /* Polished focus states */
        a:focus { outline: none; }
        a:focus-visible { box-shadow: 0 6px 24px rgba(255, 183, 77, 0.18); border-radius: 9999px; }

        /* reduce motion: disable transform transitions for users who prefer reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .will-change-transform, .transition-transform { transition: none !important; transform: none !important; }
        }

        /* responsive tweaks */
        @media (max-width: 640px) {
          .container { padding-left: 1rem; padding-right: 1rem; }
          h2 { font-size: 1.6rem; }
        }
      `}</style>
    </section>
  );
}
