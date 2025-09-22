// app/page.tsx
// Server component (default) — imports client components normally.
// Ensure '@/components/ElfsightWidget' is a client component with 'use client' at top.

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import Destinations from '@/components/Destinations';
import IcebarPromo from '@/components/IcebarPromo';
import FeaturedTours from '@/components/FeaturedTours';
import InterestGrid from '@/components/InterestGrid';
import DayTrips from '@/components/DayTrips';
import PopularInterest from '@/components/PopularInterest';
import AboutUs from '@/components/AboutUs';
import Reviews from '@/components/Reviews';
import FAQ from '@/components/FAQ';

// Server-side structured data for reviews (recommended)
import ReviewsStructuredData from '@/components/ReviewsStructuredData';

// Client-side Elfsight widget (must be a client component)
import ElfsightWidget from '@/components/ElfsightWidget';

export default function HomePage() {
  return (
    <main>
      {/* Header */}
      <Header />

      {/* Hero */}
      <HeroSection />

      {/* Destinations / Promo / Featured */}
      <Destinations />
      <IcebarPromo />
      <FeaturedTours />

      {/* Interest & Trips */}
      <InterestGrid />
      <DayTrips />
      <PopularInterest />

      {/* About & Reviews */}
      <AboutUs />

      {/* Server-side JSON-LD for reviews (important for Google) */}
      <ReviewsStructuredData />

      {/* Our own reviews UI (client) */}
      <Reviews />

      {/* Elfsight third-party reviews widget (client component) */}
      <div className="container mx-auto px-4 my-8">
      </div>

      {/* FAQ and Footer */}
      <FAQ />
      <Footer />
    </main>
  );
}
