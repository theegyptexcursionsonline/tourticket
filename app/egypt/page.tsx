// app/egypt/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TourCard from '@/components/shared/TourCard';
import { CheckCircle, Play, ArrowRight } from 'lucide-react';
import { Tour, Category } from '@/types';

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
  { src: '/pyramid3.png', alt: 'Traditional felucca on the Nile' },
  { src: '/pyramid2.png', alt: 'Temple silhouette at twilight' },
  { src: '/image.png', alt: 'Local market and cultural scene' }
];

// Removed fake pricing plans - will use real tours instead

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
  const [tours, setTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch tours
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await fetch('/api/admin/tours');
        const data = await response.json();
        if (data.success) {
          // Get all published tours - can filter by Egypt destination later
          const publishedTours = (data.data || []).filter((t: Tour) => t.isPublished === true);
          setTours(publishedTours.slice(0, 12)); // Show first 12 tours
        }
      } catch (error) {
        console.error('Failed to fetch tours:', error);
      } finally {
        setIsLoadingTours(false);
      }
    };

    fetchTours();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (data.success) {
          // Get published categories with tour counts
          const publishedCategories = (data.data || []).filter((c: Category) =>
            c.isPublished !== false && (c.tourCount || 0) > 0
          );
          setCategories(publishedCategories.slice(0, 8)); // Show first 8 categories
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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

        {/* Categories Section */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore by Category</h2>
              <p className="text-gray-600 text-lg">Find the perfect experience tailored to your interests.</p>
            </div>

            {isLoadingCategories ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded-full mb-4 mx-auto" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto" />
                  </div>
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    href={`/categories/${category.slug}`}
                    className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 text-2xl group-hover:bg-amber-400 group-hover:text-white transition-colors duration-300">
                        {category.icon || '🎯'}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors duration-300">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {category.tourCount || 0} {category.tourCount === 1 ? 'tour' : 'tours'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No categories available at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* Tour Listings Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Tours & Experiences</h2>
              <p className="text-gray-600 text-lg">Discover authentic Egyptian experiences curated for you.</p>
            </div>

            {isLoadingTours ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
                    <div className="h-56 bg-gray-200" />
                    <div className="p-6 space-y-4">
                      <div className="h-6 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="flex justify-between items-center">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-8 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tours.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {tours.map((tour, idx) => (
                    <TourCard key={tour._id} tour={tour} index={idx} />
                  ))}
                </div>

                <div className="text-center mt-12">
                  <Link
                    href="/tours"
                    className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold shadow-2xl hover:scale-[1.02] transition-all duration-300"
                  >
                    <span>View All Tours</span>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No tours available at the moment. Please check back soon!</p>
              </div>
            )}
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
