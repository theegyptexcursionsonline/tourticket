// app/egypt/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle, Play, ArrowRight, Clock, Users, Star } from 'lucide-react';

/**
 * Complete Egypt landing page: app/egypt/page.tsx
 * - Uses pyramid.png as main hero image (place in /public)
 * - Tailwind CSS required
 * - Framer Motion optional but used for subtle animation
 *
 * Replace or adjust image paths if you keep your images elsewhere.
 */

/* ---------- Page Data ---------- */
const FEATURES = [
  'Sunset Nile cruises & private felucca rides',
  'Guided pyramid tours with expert Egyptologists',
  'Authentic cultural experiences & local cuisine',
  'Luxury & boutique accommodation options',
  'Private photography sessions at sunrise',
  'VIP concierge & customizable itineraries'
];

const GALLERY = [
  { src: '/pyramid.png', alt: 'Pyramids at sunrise' },
  { src: '/pyramid-2.png', alt: 'Traditional felucca on the Nile' },
  { src: '/pyramid-3.png', alt: 'Temple silhouette at twilight' },
  { src: '/pyramid-thumb.png', alt: 'Local market and cultural scene' }
];

const PLANS = [
  {
    title: 'Explorer',
    price: '₹8,499',
    bullets: ['Guided city walk', 'Museum entry', 'Local guide', 'Basic insurance']
  },
  {
    title: 'Curator',
    price: '₹15,999',
    bullets: ['Nile cruise', 'Premium guide', 'Local lunch', 'Photo highlights']
  },
  {
    title: 'Luxury',
    price: '₹39,999',
    bullets: ['Private vehicle', '5★ stays', 'Sunset private cruise', 'Concierge services']
  }
];

const FAQS = [
  { q: 'How long are the experiences?', a: 'Typical experiences are 1–3 days depending on the package; custom itineraries can be arranged.' },
  { q: 'Are pickups included?', a: 'Some plans include transfers — check the package details or contact our concierge for tailored transport.' },
  { q: 'Is this family friendly?', a: 'Yes — we offer family-friendly packages with activities suitable for children and seniors.' }
];

/* ---------- Hero Component ---------- */
function EgyptHero() {
  const bgRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScrollRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    // entrance
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // parallax: lightweight + respects reduced motion
    if (prefersReducedMotion) return;
    const onScroll = () => {
      lastScrollRef.current = window.scrollY || window.pageYOffset;
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(updateParallax);
    };
    const updateParallax = () => {
      const el = bgRef.current;
      if (el) {
        const scroll = lastScrollRef.current;
        const y = Math.max(Math.min(scroll * 0.12, 120), -40);
        el.style.transform = `translate3d(0, ${y}px, 0) scale(1.02)`;
      }
      rafRef.current = null;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion]);

  return (
    <section className="relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          ref={bgRef}
          className="absolute inset-0 will-change-transform transition-transform duration-700 ease-out"
          aria-hidden
          style={{ transform: 'translate3d(0,0,0) scale(1.02)' }}
        >
          <Image src="/hero3.png" alt="Pyramids and Nile" fill className="object-cover object-center" priority sizes="(min-width:1024px) 1200px, 100vw" />

          {/* cinematic overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.55)_0%,_rgba(0,0,0,0.0)_45%)] pointer-events-none" />
          <div className="absolute inset-0 bg-noise opacity-6 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 py-28 md:py-40">
        <div className="max-w-4xl mx-auto text-center text-white">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="block text-amber-300/95">Discover Egypt</span>
              <span className="block text-white text-2xl sm:text-3xl font-medium mt-2">Nile journeys, ancient wonders & timeless stories</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-amber-100/95 max-w-3xl mx-auto leading-relaxed">
              Sail the Nile at sunset, walk among the pyramids at dawn — curated luxury experiences that blend history, culture, and comfort.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/egypt" className="inline-flex items-center gap-3 px-12 py-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold shadow-2xl hover:scale-[1.02] transition">
                <span>Explore Egypt</span>
                <ArrowRight size={18} />
              </Link>

              <Link href="/egypt-video" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black/45 border border-white/10 text-white font-medium shadow backdrop-blur-sm hover:bg-black/30 transition">
                <Play size={16} />
                <span>Watch Video</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <noscript>
        <div className="absolute inset-0">
          <Image src="/hero3.png" alt="Pyramids of Egypt" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      </noscript>

      <style jsx global>{`
        .bg-noise {
          background-image:
            radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px);
          background-position: 0 0, 8px 8px;
          background-size: 16px 16px;
        }
        @media (prefers-reduced-motion: reduce) {
          .will-change-transform, .transition-transform { transition: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ---------- Page ---------- */
export default function AboutEgyptLanding(): JSX.Element {
  return (
    <>
      <Header />

      <main className="pt-20 bg-white text-gray-800">
        {/* Hero */}
        <EgyptHero />

        {/* Vision */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Vision</h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                We craft travel experiences that combine the grandeur of Egypt’s ancient wonders with modern comforts and curated local encounters.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                From private Nile cruises to exclusive after-hours temple access, our team builds tailored journeys that become lifelong memories.
              </p>
            </motion.div>

            <motion.div className="w-full h-80 relative rounded-2xl overflow-hidden shadow-xl" initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <Image src="/hero2.png" alt="Felucca on Nile" fill className="object-cover" />
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What to Expect</h2>
              <p className="text-lg text-gray-600">Experiences designed for curious travelers and discerning guests.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.05 }} className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-md">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle className="h-7 w-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-800">{f}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Step Inside</h2>
              <p className="text-gray-600">Moments from curated experiences — sunrise, sunset and in-between.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GALLERY.map((img, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: idx * 0.06 }} className="w-full h-64 relative rounded-xl overflow-hidden shadow-lg">
                  <Image src={img.src} alt={img.alt} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Packages</h2>
            <p className="text-gray-600 mb-10">Flexible packages for solo travelers, couples, and VIP groups.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.map((plan, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: idx * 0.06 }} className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <h3 className="text-xl font-bold mb-4">{plan.title}</h3>
                  <div className="text-3xl font-extrabold text-gray-900 mb-6">{plan.price}</div>
                  <ul className="mb-6 space-y-2 text-left">
                    {plan.bullets.map((b, i) => (
                      <li key={i} className="text-gray-700 flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-amber-400 mt-1 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/book/${plan.title.toLowerCase()}`} className="inline-block w-full text-center px-6 py-3 rounded-full bg-amber-400 text-black font-semibold shadow hover:scale-[1.02] transition">
                    Book {plan.title}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">FAQ</h2>
              <p className="text-gray-600">Common questions answered</p>
            </div>

            <div className="space-y-4">
              {FAQS.map((f, i) => (
                <details key={i} className="bg-white rounded-xl p-5 shadow-md">
                  <summary className="cursor-pointer text-lg font-medium text-gray-800 list-none">
                    {f.q}
                  </summary>
                  <div className="mt-3 text-gray-600">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20" style={{ backgroundColor: '#2147F3' }}>
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight sm:text-4xl text-amber-300 mb-4">Ready for a Timeless Adventure?</h2>
            <p className="text-amber-100 mb-8">Book now to secure your dates. Our team will tailor an experience to your wishes.</p>
            <div>
              <Link href="/experience/egypt-booking" className="inline-block font-bold py-4 px-10 rounded-full text-lg hover:opacity-95 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-xl" style={{ color: '#2147F3', backgroundColor: '#FFED4F' }}>
                Book Your Experience
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx global>{`
        .text-shadow { text-shadow: 1px 1px 3px rgba(0,0,0,0.6); }
        .text-shadow-lg { text-shadow: 2px 2px 5px rgba(0,0,0,0.8); }
        .bg-noise {
          background-image:
            radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px);
          background-position: 0 0, 8px 8px;
          background-size: 16px 16px;
        }
      `}</style>
    </>
  );
}
