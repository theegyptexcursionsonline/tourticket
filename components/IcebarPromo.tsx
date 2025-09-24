import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * EgyptPromo - Ultra Premium (parallax removed)
 * - Responsive <picture> with LQIP
 * - Cinematic overlay + subtle grain (reduced darkness)
 * - Entrance animations + accessible focus states
 *
 * NOTE: parallax and the heavy dark gradient were removed as requested.
 */

export default function EgyptPromo() {
  // -----------------------
  // 🔧 CONTROL AREA - update image paths, text, links here
  // Put responsive images under /public/
  // -----------------------
  const imgSmall = '/pyramid2.jpg';   // for <= 640
  const imgMedium = '/pyramid2.jpg';  // for <= 1024
  const imgLarge = '/pyramid2.jpg';   // for >= 1024
  const imgLQ = '/pyramid2.jpg';      // tiny blurred placeholder (very small file)

  const heading = 'Discover Egypt';
  const subheading = 'Timeless wonders, Nile sunsets & ancient stories';
  const description =
    'Unveil the wonders of the Pharaohs — sail the Nile, explore the pyramids, and feel history come alive with curated luxury experiences.';
  const primaryHref = '/egypt';
  const primaryText = 'Explore Egypt';

  // -----------------------
  const bgRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // entrance animation trigger
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Background wrapper */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          ref={bgRef}
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          aria-hidden
        >
          <picture>
            <source srcSet={`${imgLarge} 2048w, ${imgMedium} 1024w, ${imgSmall} 640w`} sizes="(min-width: 1024px) 1200px, 100vw" />
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
                setLoaded(true);
              }}
            />
          </picture>

          {/* Lighter cinematic overlays - reduced darkness */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.18)_0%,_rgba(0,0,0,0.0)_45%)] pointer-events-none" />

          {/* subtle grain (very light) */}
          <div className="absolute inset-0 bg-noise opacity-6 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 py-20 md:py-28">
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

      {/* noscript fallback: static hero with LQ image + softer overlay */}
      <noscript>
        <div className="absolute inset-0">
          <img src={imgMedium} alt="Pyramids of Egypt" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/15 to-transparent" />
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

        /* reduce motion: keep reduced-motion support but no transforms are used for parallax */
        @media (prefers-reduced-motion: reduce) {
          .transition-transform { transition: none !important; transform: none !important; }
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
