// components/RelatedInterests.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';

interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
}

interface RelatedInterestsProps {
  currentSlug?: string;
  limit?: number;
  title?: string;
  subtitle?: string;
}

const RelatedInterests: React.FC<RelatedInterestsProps> = ({ 
  currentSlug, 
  limit = 6,
  title = "Explore More Interests",
  subtitle = "Discover other amazing experiences you might enjoy"
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
          // Filter out current interest and limit results
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
      <section className="py-16 bg-gradient-to-br from-slate-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="h-10 w-64 bg-slate-200 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 w-96 bg-slate-200 rounded-lg mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse">
                <div className="h-6 w-3/4 bg-slate-200 rounded mb-3"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
              </div>
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
    <section className="py-16 bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Related Interests
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {interests.map((interest, index) => (
            <motion.div
              key={interest._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`}
                className="group relative block bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                {/* Featured Badge */}
                {interest.featured && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                    <TrendingUp className="w-3 h-3" />
                    Featured
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 mb-2 line-clamp-2">
                      {interest.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {interest.products} {interest.products === 1 ? 'experience' : 'experiences'} available
                    </p>
                  </div>
                </div>

                {/* Type Badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    interest.type === 'attraction' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {interest.type === 'attraction' ? 'Attraction' : 'Category'}
                  </span>
                  
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
                </div>

                {/* Hover Border Effect */}
                <div className="absolute inset-0 rounded-xl border-2 border-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"></div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            href="/interests"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
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