// components/RelatedInterests.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';

interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
}

interface RelatedInterestsProps {
  currentSlug?: string;
  limit?: number;
  title?: string;
  subtitle?: string;
}

// Image mapping function
const getInterestImage = (name: string): string => {
  const lowerName = name.toLowerCase();

  const imageMap: { [key: string]: string } = {
    fun: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
    family: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop',
    sightseeing: 'https://images.unsplash.com/photo-1555881698-6bfe5f815071?w=600&h=400&fit=crop',
    historical: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop',
    bus: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop',
    water: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop',
    nightlife: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
    cultural: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&h=400&fit=crop',
    adventure: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
    luxury: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
  };

  for (const [key, url] of Object.entries(imageMap)) {
    if (lowerName.includes(key)) return url;
  }

  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop';
};

const InterestCard = ({ interest }: { interest: Interest }) => {
  const linkUrl =
    interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`;
  const imageUrl = interest.image || getInterestImage(interest.name);

  return (
    <Link
      href={linkUrl}
      aria-label={`Open ${interest.name}`}
      className="group relative block overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative w-full h-80 overflow-hidden rounded-2xl">
        <Image
          src={imageUrl}
          alt={interest.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          placeholder="empty"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Subtle hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />

        {/* Border Effect */}
        <div className="absolute inset-0 rounded-2xl border-4 border-transparent group-hover:border-cyan-400 transition-all duration-300 pointer-events-none" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg transform transition-all duration-300 group-hover:bg-white">
          <h3 className="text-lg font-bold text-slate-900 mb-1 uppercase tracking-wide">
            {interest.name}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700 font-medium">
              {interest.products} {interest.products === 1 ? 'experience' : 'experiences'}
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                interest.type === 'attraction'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {interest.type === 'attraction' ? 'Attraction' : 'Category'}
            </span>
          </div>
        </div>
      </div>

      {/* Featured Badge */}
      {interest.featured && (
        <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Featured
        </div>
      )}
    </Link>
  );
};

const RelatedInterests: React.FC<RelatedInterestsProps> = ({
  currentSlug,
  limit = 6,
  title = 'Explore More Interests',
  subtitle = 'Discover other amazing experiences you might enjoy',
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedInterests = async () => {
      try {
        const response = await fetch('/api/interests');

        if (!response.ok) {
          throw new Error('Failed to fetch interests');
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          const filtered = data.data
            .filter((interest: Interest) => interest.slug !== currentSlug && interest.products > 0)
            .slice(0, limit);

          setInterests(filtered);
        }
      } catch (error) {
        console.error('Error fetching related interests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedInterests();
  }, [currentSlug, limit]);

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <div className="text-center mb-12">
            <div className="h-10 w-64 bg-slate-200 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 w-96 bg-slate-200 rounded-lg mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(limit)].map((_, i) => (
              <div
                key={i}
                className="relative rounded-2xl bg-slate-200 animate-pulse"
                style={{ height: 320 }}
              ></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (interests.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-6 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Related Interests
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {interests.map((interest, index) => (
            <motion.div
              key={interest._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <InterestCard interest={interest} />
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Link
            href="/interests"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            View All Interests
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default RelatedInterests;