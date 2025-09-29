// components/PopularInterestsGrid.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Star, Trophy, Heart, Zap, 
  TrendingUp, Package, Sparkles 
} from 'lucide-react';

interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
}

interface PopularInterestsGridProps {
  limit?: number;
  showFeaturedOnly?: boolean;
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

const getIconForInterest = (name: string) => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('adventure') || lowerName.includes('sport')) return Zap;
  if (lowerName.includes('family') || lowerName.includes('kids')) return Heart;
  if (lowerName.includes('luxury') || lowerName.includes('premium')) return Trophy;
  if (lowerName.includes('popular') || lowerName.includes('trending')) return TrendingUp;
  if (lowerName.includes('culture') || lowerName.includes('history')) return Star;
  
  return Package;
};

const PopularInterestsGrid: React.FC<PopularInterestsGridProps> = ({ 
  limit = 12,
  showFeaturedOnly = false,
  title = "Popular Interests",
  subtitle = "Discover the most popular experiences chosen by travelers",
  columns = 4
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await fetch('/api/interests');
        
        if (!response.ok) {
          throw new Error('Failed to fetch interests');
        }

        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          let filtered = data.data.filter((interest: Interest) => interest.products > 0);
          
          if (showFeaturedOnly) {
            filtered = filtered.filter((interest: Interest) => interest.featured);
          }
          
          // Sort by products count (most popular first)
          filtered.sort((a: Interest, b: Interest) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.products - a.products;
          });
          
          setInterests(filtered.slice(0, limit));
        }
      } catch (error) {
        console.error('Error fetching interests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, [limit, showFeaturedOnly]);

  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="h-10 w-64 bg-slate-200 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 w-96 bg-slate-200 rounded-lg mx-auto animate-pulse"></div>
          </div>
          <div className={`grid ${gridColsClass[columns]} gap-6`}>
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-6 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
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
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            {showFeaturedOnly ? 'Featured Experiences' : 'Popular Categories'}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Grid */}
        <div className={`grid ${gridColsClass[columns]} gap-6`}>
          {interests.map((interest, index) => {
            const Icon = getIconForInterest(interest.name);
            
            return (
              <motion.div
                key={interest._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`}
                  className="group relative block bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-red-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Featured Badge */}
                  {interest.featured && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </div>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors duration-200 mb-2 line-clamp-2">
                      {interest.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {interest.products} {interest.products === 1 ? 'tour' : 'tours'}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      interest.type === 'attraction' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {interest.type === 'attraction' ? 'Attraction' : 'Category'}
                    </span>
                    
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all duration-200" />
                  </div>

                  {/* Shine Effect on Hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
                </Link>
              </motion.div>
            );
          })}
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
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Explore All Categories
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularInterestsGrid;